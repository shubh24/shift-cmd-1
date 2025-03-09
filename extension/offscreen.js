// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen' && message.action === 'cropScreenshot') {
    cropScreenshot(message.data.screenshotUrl, message.data.selection, message.data.requestData);
  }
});

// Crop screenshot to the selected area
function cropScreenshot(screenshotUrl, selection, requestData) {
  const img = new Image();
  
  img.onload = () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match the selection size
    canvas.width = selection.width;
    canvas.height = selection.height;
    
    // Draw only the selected portion of the image
    context.drawImage(
      img,
      selection.x, selection.y, selection.width, selection.height,
      0, 0, selection.width, selection.height
    );
    
    // Send the cropped image back to the background script
    const croppedImageUrl = canvas.toDataURL();
    chrome.runtime.sendMessage({
      action: 'cropComplete',
      croppedImageUrl,
      requestData
    });
  };
  
  img.onerror = (error) => {
    console.error('Error loading image for cropping:', error);
    chrome.runtime.sendMessage({
      action: 'cropError',
      error: 'Failed to load image for cropping',
      requestData
    });
  };
  
  img.src = screenshotUrl;
} 