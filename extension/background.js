// Store for root folder path
let rootFolderPath = '';
// Store for feature requests
let featureRequests = [];

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
  // Check if there's already an offscreen document
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create an offscreen document for image manipulation
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER'],
    justification: 'Crop screenshots for feedback'
  });
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

// Capture screenshot of the visible tab
async function captureScreenshot(tabId, data) {
  console.log('Starting screenshot capture for tab ID:', tabId);
  
  try {
    // Ensure the offscreen document is created
    await createOffscreenDocumentIfNeeded();
    
    // Capture the visible tab area
    const screenshotUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    console.log('Screenshot captured, sending to offscreen for cropping');
    
    // Send to offscreen document for cropping
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
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
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
    prompt: `Implement this UI/UX feedback: "${featureRequest.feedback}" (From screenshot ${requestId})`
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