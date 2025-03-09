// DOM elements
const rootFolderInput = document.getElementById('rootFolder');
const saveFolderButton = document.getElementById('saveFolder');
const folderStatus = document.getElementById('folderStatus');
const openSidePanelButton = document.getElementById('openSidePanel');

// Load root folder path
function loadRootFolder() {
  console.log('Loading root folder path from storage');
  chrome.runtime.sendMessage({ action: 'getRootFolder' }, (response) => {
    console.log('Got root folder path from background:', response ? response.rootFolderPath : 'undefined');
    if (response && response.rootFolderPath) {
      rootFolderInput.value = response.rootFolderPath;
      console.log('Root folder input updated with:', response.rootFolderPath);
    } else {
      console.log('No root folder path configured yet');
    }
  });
}

// Save root folder path
function saveRootFolder() {
  const path = rootFolderInput.value.trim();
  console.log('Attempting to save root folder path:', path);
  
  if (!path) {
    console.warn('Empty path provided, showing error');
    showStatus(folderStatus, 'Please enter a valid folder path', 'error');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'setRootFolder', path }, (response) => {
    console.log('Response from setting root folder:', response);
    if (response && response.success) {
      console.log('Root folder path saved successfully');
      showStatus(folderStatus, 'Folder path saved successfully', 'success');
    } else {
      console.error('Failed to save root folder path');
      showStatus(folderStatus, 'Failed to save folder path', 'error');
    }
  });
}

// Show status message
function showStatus(element, message, type) {
  console.log(`Showing status message: ${message} (${type})`);
  element.textContent = message;
  element.className = `status ${type}`;
  
  // Clear status after a delay
  setTimeout(() => {
    element.textContent = '';
    element.className = 'status';
    console.log('Status message cleared');
  }, 3000);
}

// Open side panel with feature requests
function openSidePanel() {
  console.log('Opening side panel for feature requests');
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.sidePanel.open({ 
      tabId: tabs[0].id,
      path: 'sidepanel.html'
    });
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, initializing...');
  loadRootFolder();
  
  saveFolderButton.addEventListener('click', saveRootFolder);
  openSidePanelButton.addEventListener('click', openSidePanel);
  
  console.log('Popup initialization complete');
}); 