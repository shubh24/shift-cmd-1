// Store for root folder path
let rootFolderPath = '';
// Store for feature requests
let featureRequests = [];

// Native messaging host connection
let nativePort = null;

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture_feedback') {
    console.log('Keyboard shortcut detected: Command+Shift+1');
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshotSelection' });
      }
    });
  }
});

// Create offscreen document for image manipulation
async function createOffscreenDocumentIfNeeded() {
  console.log('Checking for offscreen document');
  try {
    // Check if there's already an offscreen document
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists');
      return;
    }

    console.log('Creating offscreen document');
    // Create an offscreen document for image manipulation
    // Use only valid reasons from the list (DOM_PARSER is for HTML/XML parsing)
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Crop screenshots for feedback'
    });
    
    console.log('Offscreen document created successfully');
    
    // Wait a brief moment for the offscreen document to initialize
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    throw new Error(`Failed to create offscreen document: ${error.message}`);
  }
}

// Load stored data when the extension starts
chrome.storage.local.get(['rootFolderPath', 'featureRequests'], (result) => {
  console.log('Extension initialized with root folder path:', result.rootFolderPath);
  console.log('Loaded feature requests:', result.featureRequests ? result.featureRequests.length : 0);
  
  if (result.rootFolderPath) {
    rootFolderPath = result.rootFolderPath;
  }
  
  if (result.featureRequests) {
    featureRequests = result.featureRequests;
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message with action:', message.action);
  
  if (message.action === 'captureFeedback') {
    console.log('Capturing feedback with data:', message.data);
    captureScreenshot(sender.tab.id, message.data);
    return true; // Keep the message channel open for async response
  } else if (message.action === 'setRootFolder') {
    console.log('Setting root folder path to:', message.path);
    rootFolderPath = message.path;
    chrome.storage.local.set({ rootFolderPath });
    sendResponse({ success: true });
  } else if (message.action === 'getRootFolder') {
    console.log('Getting root folder path:', rootFolderPath);
    sendResponse({ rootFolderPath });
  } else if (message.action === 'getFeatureRequests') {
    console.log('Getting feature requests, count:', featureRequests.length);
    sendResponse({ featureRequests });
  }
});

// Listen for messages from the offscreen document
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'cropComplete') {
    const { croppedImageUrl, requestData } = message;
    console.log('Screenshot cropped via offscreen document, size:', croppedImageUrl ? croppedImageUrl.length : 'undefined');
    
    const timestamp = Date.now();
    const requestId = timestamp.toString();
    
    console.log('Generated request ID:', requestId);
    
    const featureRequest = {
      id: requestId,
      selector: requestData.selector,
      feedback: requestData.feedback,
      timestamp,
      url: requestData.url
    };
    
    console.log('Constructed feature request:', {
      id: featureRequest.id,
      selector: featureRequest.selector,
      feedbackLength: featureRequest.feedback.length,
      timestamp: featureRequest.timestamp,
      url: featureRequest.url
    });
    
    // Send data to local agent
    sendToLocalAgent(featureRequest, croppedImageUrl, requestId);
  }
});

// Connect to the native messaging host
function connectToNativeHost() {
  try {
    console.log('Connecting to native messaging host...');
    nativePort = chrome.runtime.connectNative('com.vibeback.screencapture');
    
    nativePort.onMessage.addListener((message) => {
      console.log('Received message from native host:', message);
      
      if (message.success) {
        // Process the screenshot data
        processNativeScreenshot(message.screenshotData, message.requestData);
      } else {
        console.error('Error from native host:', message.error);
        // If there was a tab waiting for response, notify it of the error
        if (message.requestData && message.requestData.tabId) {
          chrome.tabs.sendMessage(message.requestData.tabId, { 
            action: 'captureError', 
            error: message.error || 'Failed to capture screenshot'
          });
        }
      }
    });
    
    nativePort.onDisconnect.addListener(() => {
      console.log('Disconnected from native host. Last error:', chrome.runtime.lastError);
      nativePort = null;
    });
    
    return true;
  } catch (error) {
    console.error('Error connecting to native host:', error);
    return false;
  }
}

// Process screenshot from native host
function processNativeScreenshot(screenshotData, requestData) {
  console.log('Processing native screenshot with request data:', requestData);
  
  const timestamp = new Date().toISOString();
  const requestId = `req_${Date.now()}`;
  
  // Create feature request object
  const featureRequest = {
    id: requestId,
    feedback: requestData.feedback,
    timestamp: timestamp,
    url: requestData.url
  };
  
  // Send data to local agent
  sendToLocalAgent(featureRequest, screenshotData, requestId);
}

// Capture screenshot of the visible tab
async function captureScreenshot(tabId, data) {
  console.log('Starting screenshot capture for tab ID:', tabId);
  
  try {
    // Use the improved browser-based screenshot method
    await fallbackCaptureScreenshot(tabId, data);
  } catch (error) {
    console.error('Error in captureScreenshot:', error);
    // Report error to user
    chrome.tabs.sendMessage(tabId, { 
      action: 'captureError', 
      error: error.message || 'Failed to capture screenshot'
    });
  }
}

// Fall back to the original browser-based screenshot method
async function fallbackCaptureScreenshot(tabId, data) {
  console.log('Using improved browser screenshot method with data:', data);
  
  try {
    // Try to use the offscreen document for processing
    try {
      // Ensure the offscreen document is created
      await createOffscreenDocumentIfNeeded();
      
      console.log('Capturing visible tab with selection:', data.selection);
      
      // Capture the visible tab area with the highest quality possible
      const screenshotUrl = await chrome.tabs.captureVisibleTab(null, { 
        format: 'png',
        quality: 100
      });
      console.log('Screenshot captured, sending to offscreen for cropping');
      
      // Create a promise that will resolve when the crop is complete
      const cropPromise = new Promise((resolve, reject) => {
        // Set up a one-time listener for the crop result
        const cropListener = (message) => {
          if (message.action === 'cropComplete') {
            console.log('Received crop complete response');
            chrome.runtime.onMessage.removeListener(cropListener);
            resolve(message);
          } else if (message.action === 'cropError') {
            console.error('Received crop error:', message.error);
            chrome.runtime.onMessage.removeListener(cropListener);
            reject(new Error(message.error || 'Unknown cropping error'));
          }
        };
        
        // Add the listener
        chrome.runtime.onMessage.addListener(cropListener);
        
        // Set a timeout in case the offscreen document doesn't respond
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(cropListener);
          reject(new Error('Timeout waiting for crop operation'));
        }, 10000); // 10 second timeout
      });
      
      // Send the message to the offscreen document
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'cropScreenshot',
        data: {
          screenshotUrl,
          selection: data.selection,
          requestData: {
            feedback: data.feedback,
            url: data.url
          }
        }
      });
      
      // Wait for the crop to complete
      try {
        const cropResult = await cropPromise;
        // Process the cropped image
        if (cropResult.croppedImageUrl) {
          console.log('Successfully cropped screenshot, processing...');
          const timestamp = new Date().toISOString();
          const requestId = `req_${Date.now()}`;
          
          // Create feature request object
          const featureRequest = {
            id: requestId,
            feedback: data.feedback,
            timestamp: timestamp,
            url: data.url
          };
          
          // Send to local agent
          sendToLocalAgent(featureRequest, cropResult.croppedImageUrl, requestId);
        }
      } catch (cropError) {
        // If cropping fails, fall back to simple capture without cropping
        console.error('Error during cropping, falling back to simple capture:', cropError);
        useSimpleCapture(tabId, data, screenshotUrl);
      }
    } catch (offscreenError) {
      // If offscreen document creation fails, use simple capture
      console.error('Error with offscreen document, using simple capture:', offscreenError);
      
      // Capture the visible tab area
      const simpleScreenshotUrl = await chrome.tabs.captureVisibleTab(null, { 
        format: 'png',
        quality: 100
      });
      
      useSimpleCapture(tabId, data, simpleScreenshotUrl);
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    // Report error to user
    chrome.tabs.sendMessage(tabId, { 
      action: 'captureError', 
      error: error.message || 'Failed to capture screenshot'
    });
  }
}

// Simple capture method that doesn't rely on offscreen document
function useSimpleCapture(tabId, data, screenshotUrl) {
  console.log('Using simple capture without cropping');
  
  // Just use the full screenshot without cropping
  const timestamp = new Date().toISOString();
  const requestId = `req_${Date.now()}`;
  
  // Create feature request object
  const featureRequest = {
    id: requestId,
    feedback: data.feedback,
    timestamp: timestamp,
    url: data.url
  };
  
  // Add a note that this is a full screenshot
  const enhancedFeedback = data.feedback + 
    "\n\n[Note: This is a full screenshot. The selection region was: " +
    `x=${data.selection.x}, y=${data.selection.y}, ` +
    `width=${data.selection.width}, height=${data.selection.height}]`;
  
  featureRequest.feedback = enhancedFeedback;
  
  // Send to local agent
  sendToLocalAgent(featureRequest, screenshotUrl, requestId);
}

// Send data to local agent
function sendToLocalAgent(featureRequest, screenshotUrl, requestId) {
  console.log('Sending data to local agent');
  
  if (!rootFolderPath) {
    console.error('Root folder path not set');
    return;
  }
  
  const timestamp = new Date().toLocaleString();
  
  // Add to feature requests array
  featureRequests.push({
    id: requestId,
    feedback: featureRequest.feedback,
    timestamp: featureRequest.timestamp,
    url: featureRequest.url,
    prompt: `You are an expert UI/UX coding assistant working within the Cursor editor. Your task is to implement a feature request based on the following user feedback and the attached screenshot. The feedback is provided verbatim as given by the user, and you must focus exclusively on modifying the UI element shown in the attached screenshot file. Do not change any other parts of the codebase unless explicitly mentioned in the feedback.

User Feedback (verbatim): ${featureRequest.feedback}

Attached Screenshot: @screenshot-${requestId}.png 

Instructions:
1. Analyze the screenshot @screenshot-${requestId}.png to identify the specific UI element referenced by the user feedback.
2. Interpret the feedback literally and apply the requested change only to the UI element depicted in the screenshot.
3. Provide the exact code changes (e.g., HTML, CSS, JavaScript) needed to implement the feedback, ensuring no unintended modifications elsewhere.
4. If the screenshot or feedback is unclear, make a reasonable assumption based on the image and explain your reasoning, but prioritize precision over speculation.
5. Return the modified code snippet and a brief explanation of what you changed.

Context:
- The screenshot was taken from a localhost web app.
- The codebase is located in the root folder configured in the VibeSnap Chrome extension.
- You have access to the full project context via Cursor's file system integration.

Focus strictly on the UI element in the screenshot and the verbatim feedback. Begin your response with "Analyzing screenshot and feedback..." and end with "Code changes complete."`
  });
  
  // Save feature requests to storage
  chrome.storage.local.set({ featureRequests });
  
  // Send to local agent via fetch
  fetch('http://localhost:3000/save-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rootFolder: rootFolderPath,
      featureRequest,
      screenshot: screenshotUrl,
      requestId
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Successfully sent to local agent:', data);
  })
  .catch(error => {
    console.error('Error sending to local agent:', error);
  });
} 