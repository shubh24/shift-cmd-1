# Vibe Coding Feedback Tool - Chrome Extension

## Installation

1. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select this directory

2. **Creating icons (optional)**:
   If you want to add icons to the extension:
   
   a. Open the `images/create-icons.html` file in your browser
   
   b. Click "Generate Icons" and download each icon
   
   c. Save all three files (icon16.png, icon48.png, icon128.png) in the `images` folder
   
   d. Update the `manifest.json` file to include:
   ```json
   "action": {
     "default_popup": "popup.html",
     "default_icon": {
       "16": "images/icon16.png",
       "48": "images/icon48.png",
       "128": "images/icon128.png"
     }
   }
   ```

## Usage

1. Make sure the local agent is running (from the `agent` directory)
2. Navigate to a localhost web application
3. Click the "Enable Feedback Mode" button on the page
4. Click on UI elements to provide feedback
5. Use the extension popup to view and copy feedback prompts

## Troubleshooting

- If the extension fails to load, check the console for errors
- Make sure all required files are present and correctly referenced in manifest.json
- If you see the "Failed to load extension" error about icons, follow the icon setup instructions above or remove icon references from the manifest 