/**
 * Test script for offscreen document functionality
 * 
 * Copy and paste this into the Chrome developer console when testing
 * the extension to verify that offscreen documents are working correctly.
 */

(async function() {
  console.log('🧪 Starting offscreen document test...');
  
  try {
    // Get extension ID
    const extensionId = chrome.runtime.id;
    console.log('Extension ID:', extensionId);
    
    // Check if offscreen document exists
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    console.log('Existing contexts:', contexts);
    
    if (contexts.length === 0) {
      console.log('⚠️ No offscreen document found. Creating one...');
      
      // Create an offscreen document for testing
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Testing offscreen document functionality'
      });
      
      console.log('✅ Offscreen document created');
    } else {
      console.log('✅ Offscreen document already exists');
    }
    
    // Test sending a message to the offscreen document
    console.log('📤 Testing message to offscreen document...');
    
    // Create a simple test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Test', 30, 50);
    const testImageUrl = canvas.toDataURL();
    
    // Create a promise that will resolve when we get a response
    const responsePromise = new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.action === 'cropComplete' || message.action === 'cropError') {
          console.log('📩 Received response from offscreen document:', message.action);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message);
        }
      };
      
      chrome.runtime.onMessage.addListener(listener);
      
      // Set a timeout
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Timeout waiting for response from offscreen document'));
      }, 5000);
    });
    
    // Send the test message
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'cropScreenshot',
      data: {
        screenshotUrl: testImageUrl,
        selection: { x: 10, y: 10, width: 50, height: 50 },
        requestData: { test: true }
      }
    });
    
    console.log('⏳ Waiting for response...');
    
    // Wait for the response
    const response = await responsePromise;
    
    if (response.action === 'cropComplete') {
      console.log('✅ Test successful! Received cropped image URL:', 
        response.croppedImageUrl ? response.croppedImageUrl.substring(0, 30) + '...' : 'undefined');
      
      // Show the cropped image
      if (response.croppedImageUrl) {
        console.log('Preview of cropped image:');
        const img = document.createElement('img');
        img.src = response.croppedImageUrl;
        img.style.border = '2px solid green';
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        console.log(img);
      }
    } else {
      console.error('❌ Test failed! Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
})(); 