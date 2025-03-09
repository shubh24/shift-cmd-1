# Vibe Coding Feedback Tool

A Chrome extension and local agent system to streamline UI/UX feedback for vibe coding in Cursor. Easily capture, store and generate feedback prompts for Cursor's Composer/Agent mode.

## Features

- **Root Folder Configuration**: Set where feedback files will be stored
- **Visual Feedback Capture**: Click on UI elements and add comments
- **Screenshot Capture**: Automatically save screenshots of selected elements
- **Prompt Generation**: Create Cursor-ready prompts that reference saved files
- **Feature Request Management**: View and copy previous feedback requests
- **Native macOS Screenshot Capture**: Use macOS's built-in screencapture for pixel-perfect screenshots

## Project Structure

```
vibeback/
├── extension/               # Chrome Extension
│   ├── manifest.json        # Extension configuration
│   ├── content.js           # Content script for localhost pages
│   ├── background.js        # Background service worker
│   ├── popup.html           # Extension popup interface
│   ├── popup.js             # Popup functionality
│   └── images/              # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── agent/                   # Local Node.js Agent
│   ├── agent.js             # Express server for file storage
│   └── package.json         # Node.js dependencies
└── native-host/             # Native Messaging Host for Screenshot Capture
    ├── screencapture-host.js  # Native host implementation
    ├── install.sh           # Installation script
    ├── test.js              # Test script for screencapture
    └── README.md            # Instructions for native host
```

## Installation

### Local Agent Setup

1. Navigate to the agent directory:
   ```
   cd agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the agent:
   ```
   npm start
   ```
   The agent will be available at http://localhost:3000

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `extension` directory
4. The Vibe Coding Feedback Tool should now appear in your extensions list

### Native Screenshot Host Setup (macOS Only)

For pixel-perfect screenshots, you can install the native messaging host:

1. Navigate to the native-host directory:
   ```
   cd native-host
   ```

2. Run the installation script:
   ```
   ./install.sh
   ```

3. When prompted, enter your Chrome extension ID (found in `chrome://extensions/`)

4. Ensure Terminal/your editor has screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording

## Usage

1. **Configure Root Folder**:
   - Click on the extension icon in Chrome
   - Enter the absolute path to your project folder
   - Click "Save Path"

2. **Capture Feedback**:
   - Navigate to your localhost web application
   - Click the "Enable Feedback Mode" button that appears on the page
   - Click on any UI element you want to provide feedback for
   - Enter your feedback in the prompt
   - The feedback and screenshot will be saved to your configured folder

3. **Use Feedback in Cursor**:
   - Open the extension popup
   - Click on any saved feedback request
   - The prompt will be copied to your clipboard
   - Paste into Cursor (Cmd + L) and use in Composer/Agent mode

## Requirements

- Chrome browser
- Node.js and npm
- MacOS for native screenshot capability (optional but recommended)
- A localhost web application for testing

## Troubleshooting

If screenshots are not working correctly:

1. **Check Browser Console**: Open the developer console (F12 or Cmd+Option+I) to see any error messages
2. **Verify Extension Permissions**: Make sure the extension has the necessary permissions (activeTab, screenshots)
3. **Chrome Version**: This extension works best with Chrome version 116 or later. Some features might not work in older versions.
4. **Fallback Mode**: If you see errors about "offscreen document", the extension will fall back to taking full-page screenshots instead of cropped ones. This is a compatibility measure for older Chrome versions.
5. **Try the Debug Tool**: Use the debug-screenshot.js tool to diagnose selection issues:
   ```javascript
   fetch('chrome-extension://YOUR_EXTENSION_ID/debug-screenshot.js')
     .then(r => r.text())
     .then(code => eval(code));
   ```
6. **Check High-DPI Displays**: High-resolution displays might need extra configuration
7. **Verify Scroll Handling**: Make sure the area you're capturing is visible in the viewport

If you're seeing any errors related to offscreen documents:
1. The extension will automatically fall back to capturing full screenshots without cropping
2. Your feedback will still be recorded with a note about the selection region
3. To fix this permanently, try updating Chrome to the latest version

The extension provides detailed logging in the console that can help diagnose problems with screenshot capture.

## Development

To run the agent in development mode with auto-restart:
```
cd agent
npm run dev
```

To test the native messaging host:
```
cd native-host
./test.js
```

## License

MIT 