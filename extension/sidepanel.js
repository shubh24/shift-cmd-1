// DOM elements
const feedbackListContainer = document.getElementById('feedbackList');
const notification = document.getElementById('notification');
const imageDialog = document.getElementById('imageDialog');
const dialogImage = document.getElementById('dialogImage');
const closeDialogButton = document.getElementById('closeDialog');

// Global variables
let rootFolderPath = '';
let feedbackItems = [];

// Initialize the panel
function init() {
  console.log('Side panel initialized');
  loadRootFolderPath();
  loadFeedbackItems();
  
  // Set up event listeners
  closeDialogButton.addEventListener('click', closeImageDialog);
  
  // Set up polling to refresh data
  setInterval(loadFeedbackItems, 30000); // Refresh every 30 seconds
}

// Load root folder path
function loadRootFolderPath() {
  chrome.runtime.sendMessage({ action: 'getRootFolder' }, (response) => {
    if (response && response.rootFolderPath) {
      rootFolderPath = response.rootFolderPath;
      console.log('Root folder path loaded:', rootFolderPath);
    }
  });
}

// Load feedback items
function loadFeedbackItems() {
  console.log('Loading feedback items');
  chrome.runtime.sendMessage({ action: 'getFeatureRequests' }, (response) => {
    if (response && response.featureRequests && response.featureRequests.length) {
      feedbackItems = response.featureRequests;
      renderFeedbackItems();
    } else {
      feedbackListContainer.innerHTML = '<div class="empty-state">No feedback items yet. Use Command+Shift+1 to capture feedback.</div>';
    }
  });
}

// Render feedback items
function renderFeedbackItems() {
  console.log(`Rendering ${feedbackItems.length} feedback items`);
  feedbackListContainer.innerHTML = '';
  
  // Sort by timestamp, newest first
  const sortedItems = [...feedbackItems].sort((a, b) => b.timestamp - a.timestamp);
  
  sortedItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'feedback-card';
    card.dataset.id = item.id;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(item.timestamp).toLocaleString();
    
    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = item.url || 'Unknown URL';
    url.title = item.url;
    
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = item.feedback;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const viewImageBtn = document.createElement('button');
    viewImageBtn.className = 'view-image-btn';
    viewImageBtn.textContent = 'View Screenshot';
    viewImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewScreenshot(item.id);
    });
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy Prompt';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyPromptToClipboard(item.prompt);
    });
    
    actions.appendChild(viewImageBtn);
    actions.appendChild(copyBtn);
    
    card.appendChild(timestamp);
    card.appendChild(url);
    card.appendChild(content);
    card.appendChild(actions);
    
    feedbackListContainer.appendChild(card);
  });
}

// Copy prompt to clipboard
function copyPromptToClipboard(prompt) {
  navigator.clipboard.writeText(prompt)
    .then(() => {
      showNotification('Prompt copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy prompt:', err);
      showNotification('Failed to copy prompt');
    });
}

// View screenshot
function viewScreenshot(id) {
  console.log('Viewing screenshot for ID:', id);
  
  if (!rootFolderPath) {
    showNotification('Root folder path not set');
    return;
  }
  
  // Construct the file URL
  const screenshotPath = `file://${rootFolderPath}/screenshot-${id}.png`;
  dialogImage.src = screenshotPath;
  
  // Show the dialog
  imageDialog.classList.add('show');
}

// Close image dialog
function closeImageDialog() {
  imageDialog.classList.remove('show');
}

// Show notification
function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 