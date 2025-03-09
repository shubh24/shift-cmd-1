// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen' && message.action === 'cropScreenshot') {
    console.log('Offscreen: Received crop request');
    // Don't return true here, as we'll handle the response through a separate message
    cropScreenshot(message.data.screenshotUrl, message.data.selection, message.data.requestData);
    // Send an immediate response to prevent channel closing
    sendResponse({status: "processing"});
  }
  return false; // Don't keep the channel open
});

// Crop screenshot to the selected area
function cropScreenshot(screenshotUrl, selection, requestData) {
  console.log('Offscreen: Starting crop with selection:', selection);
  
  // Validate selection object before processing
  if (!selection || typeof selection !== 'object' || 
      !('x' in selection) || !('y' in selection) || 
      !('width' in selection) || !('height' in selection)) {
    console.error('Offscreen: Invalid selection object:', selection);
    sendErrorMessage('Invalid selection object', requestData);
    return;
  }
  
  // Make sure we have positive dimensions
  if (selection.width <= 0 || selection.height <= 0) {
    console.error('Offscreen: Selection has invalid dimensions:', selection);
    sendErrorMessage('Selection must have positive width and height', requestData);
    return;
  }
  
  const img = new Image();
  
  // Store the original handler
  const handleImageLoad = () => {
    try {
      const canvas = document.getElementById('canvas');
      if (!canvas) {
        console.error('Offscreen: Canvas element not found');
        sendErrorMessage('Canvas element not found', requestData);
        return;
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Offscreen: Failed to get canvas context');
        sendErrorMessage('Failed to get canvas context', requestData);
        return;
      }
      
      // Account for device pixel ratio for more accurate cropping
      const dpr = window.devicePixelRatio || 1;
      console.log('Offscreen: Device pixel ratio:', dpr);
      
      // Log the dimensions for debugging
      console.log('Offscreen: Image dimensions:', img.width, 'x', img.height);
      console.log('Offscreen: Selection:', selection);
      
      // Ensure image has valid dimensions
      if (img.width === 0 || img.height === 0) {
        console.error('Offscreen: Image has zero dimensions');
        sendErrorMessage('Screenshot image has invalid dimensions', requestData);
        return;
      }
      
      // Calculate scaled coordinates
      const scaledSelection = {
        x: Math.round(selection.x * dpr),
        y: Math.round(selection.y * dpr),
        width: Math.round(selection.width * dpr),
        height: Math.round(selection.height * dpr)
      };
      
      console.log('Offscreen: Scaled selection:', scaledSelection);
      
      // First define x/y positions safely
      const safeX = Math.max(0, Math.min(scaledSelection.x, img.width - 1));
      const safeY = Math.max(0, Math.min(scaledSelection.y, img.height - 1));
      
      // Then use these to calculate width/height
      const safeWidth = Math.min(scaledSelection.width, img.width - safeX);
      const safeHeight = Math.min(scaledSelection.height, img.height - safeY);
      
      // Create fixed selection with safe values
      const fixedSelection = {
        x: safeX,
        y: safeY,
        width: Math.max(1, safeWidth), // Ensure at least 1px
        height: Math.max(1, safeHeight) // Ensure at least 1px
      };
      
      console.log('Offscreen: Fixed bounded selection:', fixedSelection);
      
      // Set canvas dimensions to match the display (CSS) size of the selection
      canvas.width = Math.max(1, selection.width);
      canvas.height = Math.max(1, selection.height);
      
      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw only the selected portion of the image, scaling to match the display size
      try {
        context.drawImage(
          img,
          fixedSelection.x, fixedSelection.y, 
          fixedSelection.width, fixedSelection.height,
          0, 0, canvas.width, canvas.height
        );
        
        // Send the cropped image back to the background script
        const croppedImageUrl = canvas.toDataURL('image/png');
        console.log('Offscreen: Crop complete, sending result');
        chrome.runtime.sendMessage({
          action: 'cropComplete',
          croppedImageUrl,
          requestData
        });
      } catch (drawError) {
        console.error('Offscreen: Error drawing image:', drawError);
        sendErrorMessage(`Error drawing image: ${drawError.message}`, requestData);
      }
    } catch (error) {
      console.error('Offscreen: Error processing image:', error);
      sendErrorMessage(`Failed to process image: ${error.message}`, requestData);
    }
  };
  
  // Set a timeout in case the image takes too long to load
  const imageLoadTimeout = setTimeout(() => {
    console.error('Offscreen: Image load timeout');
    sendErrorMessage('Image loading timed out', requestData);
  }, 5000); // 5 second timeout
  
  // Assign handlers with timeout management
  img.onload = () => {
    clearTimeout(imageLoadTimeout);
    handleImageLoad();
  };
  
  img.onerror = (error) => {
    clearTimeout(imageLoadTimeout);
    console.error('Offscreen: Error loading image for cropping:', error);
    sendErrorMessage('Failed to load image for cropping', requestData);
  };
  
  // Start loading the image
  img.src = screenshotUrl;
}

// Helper function to send error messages
function sendErrorMessage(errorMessage, requestData) {
  try {
    chrome.runtime.sendMessage({
      action: 'cropError',
      error: errorMessage,
      requestData
    });
  } catch (e) {
    console.error('Offscreen: Failed to send error message:', e);
  }
} 