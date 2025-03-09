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
  }
});

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
  
  // Show instruction
  const instruction = document.createElement('div');
  instruction.textContent = 'Click and drag to select area for screenshot, then enter your feedback';
  instruction.style.position = 'fixed';
  instruction.style.top = '20px';
  instruction.style.left = '50%';
  instruction.style.transform = 'translateX(-50%)';
  instruction.style.padding = '10px 20px';
  instruction.style.backgroundColor = '#333';
  instruction.style.color = '#fff';
  instruction.style.borderRadius = '5px';
  instruction.style.zIndex = '10001';
  instruction.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(instruction);
  
  // Remove instruction after 3 seconds
  setTimeout(() => {
    document.body.removeChild(instruction);
  }, 3000);
  
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
  const selection = {
    x: parseInt(selectionBox.style.left),
    y: parseInt(selectionBox.style.top),
    width: parseInt(selectionBox.style.width),
    height: parseInt(selectionBox.style.height)
  };
  
  if (selection.width < 10 || selection.height < 10) {
    // Selection too small, cancel
    cleanupSelection();
    return;
  }
  
  // Prompt user for feedback
  promptForFeedback(selection);
}

// Prompt user for feedback
function promptForFeedback(selection) {
  // Create the feedback UI dialog
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#fff';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '8px';
  dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  dialog.style.zIndex = '10002';
  dialog.style.width = '400px';
  dialog.style.maxWidth = '90%';
  dialog.style.fontFamily = 'Arial, sans-serif';
  
  const title = document.createElement('h2');
  title.textContent = 'Enter Feedback';
  title.style.margin = '0 0 15px 0';
  title.style.fontSize = '18px';
  title.style.fontWeight = '600';
  
  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.height = '120px';
  textarea.style.padding = '10px';
  textarea.style.border = '1px solid #ddd';
  textarea.style.borderRadius = '4px';
  textarea.style.boxSizing = 'border-box';
  textarea.style.fontSize = '14px';
  textarea.style.fontFamily = 'Arial, sans-serif';
  textarea.style.resize = 'vertical';
  textarea.style.marginBottom = '15px';
  textarea.placeholder = 'Describe what you want to change or improve...';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.gap = '10px';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.border = '1px solid #ddd';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.backgroundColor = '#f5f5f5';
  cancelButton.style.cursor = 'pointer';
  
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit';
  submitButton.style.padding = '8px 16px';
  submitButton.style.border = 'none';
  submitButton.style.borderRadius = '4px';
  submitButton.style.backgroundColor = '#4285F4';
  submitButton.style.color = '#fff';
  submitButton.style.cursor = 'pointer';
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);
  
  dialog.appendChild(title);
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
  chrome.runtime.sendMessage({
    action: 'captureFeedback',
    data: {
      selection: selection,
      feedback: feedback,
      url: window.location.href
    }
  });
}

// Initialize content script
function init() {
  console.log('Vibe Coding Feedback Tool content script initialized');
}

// Start the content script
init();
