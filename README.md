# Vibe Coding Feedback Tool

A Chrome extension and local agent system to streamline UI/UX feedback for vibe coding in Cursor. Easily capture, store and generate feedback prompts for Cursor's Composer/Agent mode.

## Features

- **Root Folder Configuration**: Set where feedback files will be stored
- **Visual Feedback Capture**: Click on UI elements and add comments
- **Screenshot Capture**: Automatically save screenshots of selected elements
- **Prompt Generation**: Create Cursor-ready prompts that reference saved files
- **Feature Request Management**: View and copy previous feedback requests

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
└── agent/                   # Local Node.js Agent
    ├── agent.js             # Express server for file storage
    └── package.json         # Node.js dependencies
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
- A localhost web application for testing

## Development

To run the agent in development mode with auto-restart:
```
cd agent
npm run dev
```

To create or update extension icons, open `extension/icon-generator.html` in a browser.

## License

MIT 