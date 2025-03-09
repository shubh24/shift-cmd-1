// Global flag to track if we're in feedback mode
let feedbackModeActive = false;
let screenshotSelectionActive = false;
let selectionStart = null;
let selectionOverlay = null;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScreenshotSelection') {
    startScreenshotSelection();
    return true;
  } else if (message.action === 'captureError') {
    // Show error notification to user
    showErrorNotification(message.error || 'Error capturing screenshot');
    return true;
  }
});

// Show error notification
function showErrorNotification(errorMessage) {
  console.error('Showing error notification:', errorMessage);
  
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#f44336';
  notification.style.color = 'white';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.maxWidth = '80%';
  notification.style.textAlign = 'center';
  
  // Check for various error types
  if (errorMessage.includes('offscreen document') || 
      errorMessage.includes('crop') || 
      errorMessage.includes('selection') ||
      errorMessage.includes('bound') ||
      errorMessage.includes('canvas')) {
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Screenshot Error</div>
      <div>${errorMessage}</div>
      <div style="margin-top: 8px; font-size: 0.9em;">Falling back to full screenshot mode.</div>
    `;
  } else {
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Screenshot Error</div>
      <div>${errorMessage}</div>
    `;
  }
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 5000);
}

// Start screenshot selection mode
function startScreenshotSelection() {
  if (screenshotSelectionActive) return;
  
  console.log('Starting screenshot selection mode');
  screenshotSelectionActive = true;
  document.body.style.cursor = 'crosshair';
  
  // Create selection overlay
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = 'screenshot-selection-overlay';
  selectionOverlay.style.position = 'fixed';
  selectionOverlay.style.top = '0';
  selectionOverlay.style.left = '0';
  selectionOverlay.style.width = '100%';
  selectionOverlay.style.height = '100%';
  selectionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  selectionOverlay.style.zIndex = '10000';
  selectionOverlay.style.display = 'none';
  document.body.appendChild(selectionOverlay);
  
  // Create selection box
  const selectionBox = document.createElement('div');
  selectionBox.id = 'screenshot-selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
  selectionBox.style.display = 'none';
  selectionOverlay.appendChild(selectionBox);
  
  // Add event listeners for selection
  document.addEventListener('mousedown', handleSelectionStart);
  document.addEventListener('mousemove', handleSelectionMove);
  document.addEventListener('mouseup', handleSelectionEnd);
  // Add key listener to cancel with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cleanupSelection();
    }
  });
  
  selectionOverlay.style.display = 'block';
}

// Handle selection start
function handleSelectionStart(e) {
  selectionStart = { x: e.clientX, y: e.clientY };
  
  const selectionBox = document.getElementById('screenshot-selection-box');
  selectionBox.style.left = `${e.clientX}px`;
  selectionBox.style.top = `${e.clientY}px`;
  selectionBox.style.width = '0';
  selectionBox.style.height = '0';
  selectionBox.style.display = 'block';
}

// Handle selection move
function handleSelectionMove(e) {
  if (!selectionStart) return;
  
  const selectionBox = document.getElementById('screenshot-selection-box');
  const width = e.clientX - selectionStart.x;
  const height = e.clientY - selectionStart.y;
  
  if (width < 0) {
    selectionBox.style.left = `${e.clientX}px`;
    selectionBox.style.width = `${-width}px`;
  } else {
    selectionBox.style.left = `${selectionStart.x}px`;
    selectionBox.style.width = `${width}px`;
  }
  
  if (height < 0) {
    selectionBox.style.top = `${e.clientY}px`;
    selectionBox.style.height = `${-height}px`;
  } else {
    selectionBox.style.top = `${selectionStart.y}px`;
    selectionBox.style.height = `${height}px`;
  }
}

// Handle selection end
function handleSelectionEnd(e) {
  if (!selectionStart) return;
  
  document.removeEventListener('mousedown', handleSelectionStart);
  document.removeEventListener('mousemove', handleSelectionMove);
  document.removeEventListener('mouseup', handleSelectionEnd);
  
  const selectionBox = document.getElementById('screenshot-selection-box');
  
  // Get the scroll position for accurate coordinates
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // Convert from style string to number
  const selectionRect = {
    x: parseInt(selectionBox.style.left),
    y: parseInt(selectionBox.style.top),
    width: parseInt(selectionBox.style.width),
    height: parseInt(selectionBox.style.height)
  };
  
  // Get client's DPR for better coordinates
  const dpr = window.devicePixelRatio || 1;
  console.log('Content: Device pixel ratio:', dpr);
  
  // Ensure all values are valid numbers
  for (let key in selectionRect) {
    if (isNaN(selectionRect[key])) {
      console.error('Content: Invalid selection value for', key, selectionRect[key]);
      selectionRect[key] = 0;
    }
  }
  
  // Create the final selection object with client coordinates (relative to viewport)
  const selection = {
    x: selectionRect.x,
    y: selectionRect.y,
    width: Math.max(10, selectionRect.width), // Ensure minimum size
    height: Math.max(10, selectionRect.height) // Ensure minimum size
  };
  
  console.log('Content: Selection coordinates (viewport):', selection);
  
  if (selection.width < 10 || selection.height < 10) {
    // Selection too small, cancel
    console.warn('Content: Selection too small, canceling');
    cleanupSelection();
    showErrorNotification('Selection too small. Please select a larger area.');
    return;
  }
  
  // Prompt user for feedback
  promptForFeedback(selection);
}

// Prompt user for feedback
function promptForFeedback(selection) {
  // Create the feedback UI dialog with glassmorphic design
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
  dialog.style.backdropFilter = 'blur(10px)';
  dialog.style.webkitBackdropFilter = 'blur(10px)';
  dialog.style.padding = '25px';
  dialog.style.borderRadius = '16px';
  dialog.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1), 0 1px 8px rgba(0, 0, 0, 0.06)';
  dialog.style.border = '1px solid rgba(255, 255, 255, 0.5)';
  dialog.style.zIndex = '10002';
  dialog.style.width = '450px';
  dialog.style.maxWidth = '90%';
  dialog.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  dialog.style.color = '#1E293B';
  
  // Create header section
  const headerContainer = document.createElement('div');
  headerContainer.style.marginBottom = '20px';
  
  const title = document.createElement('h2');
  title.textContent = 'Capture Feedback';
  title.style.margin = '0 0 8px 0';
  title.style.fontSize = '22px';
  title.style.fontWeight = '700';
  title.style.color = '#0F172A';
  title.style.letterSpacing = '-0.01em';
  
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Share your thoughts about this element or feature';
  subtitle.style.margin = '0';
  subtitle.style.fontSize = '14px';
  subtitle.style.color = '#64748B';
  subtitle.style.fontWeight = '400';
  
  headerContainer.appendChild(title);
  headerContainer.appendChild(subtitle);
  
  // Create textarea with improved styling
  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.height = '120px';
  textarea.style.padding = '12px 15px';
  textarea.style.border = '1px solid rgba(203, 213, 225, 0.8)';
  textarea.style.borderRadius = '8px';
  textarea.style.boxSizing = 'border-box';
  textarea.style.fontSize = '15px';
  textarea.style.fontFamily = 'inherit';
  textarea.style.resize = 'vertical';
  textarea.style.marginBottom = '20px';
  textarea.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  textarea.style.outline = 'none';
  textarea.style.transition = 'border-color 0.2s ease';
  textarea.placeholder = 'Describe what you want to change or improve...';
  
  // Add focus effect to textarea
  textarea.addEventListener('focus', () => {
    textarea.style.borderColor = '#3B82F6';
    textarea.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
  });
  
  textarea.addEventListener('blur', () => {
    textarea.style.borderColor = 'rgba(203, 213, 225, 0.8)';
    textarea.style.boxShadow = 'none';
  });
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.gap = '12px';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '10px 18px';
  cancelButton.style.border = '1px solid rgba(203, 213, 225, 0.8)';
  cancelButton.style.borderRadius = '8px';
  cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  cancelButton.style.color = '#475569';
  cancelButton.style.fontSize = '14px';
  cancelButton.style.fontWeight = '500';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.transition = 'all 0.2s ease';
  
  // Add hover effect to cancel button
  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = '#F8FAFC';
  });
  
  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  });
  
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit Feedback';
  submitButton.style.padding = '10px 18px';
  submitButton.style.border = 'none';
  submitButton.style.borderRadius = '8px';
  submitButton.style.background = 'linear-gradient(135deg, #3B82F6, #2563EB)';
  submitButton.style.color = '#fff';
  submitButton.style.fontSize = '14px';
  submitButton.style.fontWeight = '500';
  submitButton.style.cursor = 'pointer';
  submitButton.style.transition = 'all 0.2s ease';
  submitButton.style.boxShadow = '0 2px 5px rgba(37, 99, 235, 0.3)';
  
  // Add hover effect to submit button
  submitButton.addEventListener('mouseover', () => {
    submitButton.style.transform = 'translateY(-1px)';
    submitButton.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
  });
  
  submitButton.addEventListener('mouseout', () => {
    submitButton.style.transform = 'translateY(0)';
    submitButton.style.boxShadow = '0 2px 5px rgba(37, 99, 235, 0.3)';
  });
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);
  
  dialog.appendChild(headerContainer);
  dialog.appendChild(textarea);
  dialog.appendChild(buttonContainer);
  
  document.body.appendChild(dialog);
  
  // Focus the textarea
  textarea.focus();
  
  // Handle cancel button
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(dialog);
    cleanupSelection();
  });
  
  // Handle submit button
  submitButton.addEventListener('click', () => {
    const feedback = textarea.value.trim();
    if (feedback) {
      captureAndSendScreenshot(selection, feedback);
    }
    document.body.removeChild(dialog);
    cleanupSelection();
  });
}

// Cleanup selection UI
function cleanupSelection() {
  screenshotSelectionActive = false;
  selectionStart = null;
  document.body.style.cursor = 'default';
  
  if (selectionOverlay && selectionOverlay.parentNode) {
    document.body.removeChild(selectionOverlay);
  }
  selectionOverlay = null;
}

// Capture and send screenshot
function captureAndSendScreenshot(selection, feedback) {
  console.log('Content: Starting capture with selection:', selection);
  
  // First ensure the selected area is fully visible
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Get the current scroll position
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // Create an enhanced selection object that includes scroll position
  // for debugging and potential future improvements
  const enhancedSelection = {
    ...selection,
    absoluteX: selection.x + scrollX,
    absoluteY: selection.y + scrollY,
    scrollX: scrollX,
    scrollY: scrollY,
    viewportWidth: viewportWidth,
    viewportHeight: viewportHeight
  };
  
  console.log('Content: Enhanced selection with scroll info:', enhancedSelection);
  
  // Check if selection is outside viewport
  const needsScroll = 
    selection.y < 0 || 
    selection.y + selection.height > viewportHeight ||
    selection.x < 0 ||
    selection.x + selection.width > viewportWidth;
  
  if (needsScroll) {
    console.log('Content: Selection outside viewport, scrolling to make it visible');
    
    // Calculate the scroll position to center the selection in view if possible
    const targetScrollX = scrollX + selection.x + (selection.width / 2) - (viewportWidth / 2);
    const targetScrollY = scrollY + selection.y + (selection.height / 2) - (viewportHeight / 2);
    
    // Scroll to position
    window.scrollTo({
      top: targetScrollY,
      left: targetScrollX,
      behavior: 'instant'
    });
    
    // Wait a bit longer for scroll to complete before capturing
    setTimeout(() => {
      // Get new scroll position after scrolling
      const newScrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const newScrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Calculate how much the page actually scrolled
      const scrollDiffX = newScrollX - scrollX;
      const scrollDiffY = newScrollY - scrollY;
      
      // Adjust selection coordinates based on actual scroll change
      const updatedSelection = {
        x: selection.x - scrollDiffX,
        y: selection.y - scrollDiffY,
        width: selection.width,
        height: selection.height
      };
      
      console.log('Content: Updated selection after scroll:', updatedSelection);
      
      chrome.runtime.sendMessage({
        action: 'captureFeedback',
        data: {
          selection: updatedSelection,
          feedback: feedback,
          url: window.location.href
        }
      });
    }, 300); // Increased delay to ensure scroll and rendering completes
  } else {
    console.log('Content: Selection within viewport, capturing directly');
    
    // No scroll needed, send immediately
    chrome.runtime.sendMessage({
      action: 'captureFeedback',
      data: {
        selection: selection,
        feedback: feedback,
        url: window.location.href
      }
    });
  }
}

// Initialize content script
function init() {
  console.log('Vibe Coding Feedback Tool content script initialized');
}

// Start the content script
init();
