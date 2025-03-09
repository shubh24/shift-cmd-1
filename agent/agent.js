const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable JSON parsing for request bodies
app.use(express.json({ limit: '50mb' }));

// Enable CORS for Chrome extension
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.send({ status: 'Vibe Coding Feedback Agent is running' });
});

// Save feedback endpoint
app.post('/save-feedback', async (req, res) => {
  try {
    const { rootFolder, featureRequest, screenshot, requestId } = req.body;
    
    console.log('Received feedback submission with:');
    console.log('- Root folder:', rootFolder);
    console.log('- Request ID:', requestId);
    console.log('- Feature request length:', featureRequest ? featureRequest.feedback.length : 'undefined');
    console.log('- Screenshot data length:', screenshot ? screenshot.length : 'undefined');
    
    if (!rootFolder || !featureRequest || !screenshot || !requestId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Ensure root folder exists
    try {
      console.log('Attempting to create/ensure root folder:', rootFolder);
      await fs.mkdir(rootFolder, { recursive: true });
      console.log('Root folder created/exists:', rootFolder);
    } catch (err) {
      console.error('Error creating root folder:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create root folder' 
      });
    }
    
    // Create file paths
    const screenshotPath = path.join(rootFolder, `screenshot-${requestId}.png`);
    console.log('Screenshot will be saved to:', screenshotPath);
    
    // Save screenshot
    // Convert base64 to image file
    try {
      const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
      await fs.writeFile(screenshotPath, base64Data, 'base64');
      console.log('Screenshot file saved successfully');
    } catch (err) {
      console.error('Error saving screenshot file:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to save screenshot file'
      });
    }
    
    // Generate the final prompt
    const prompt = `I want you to implement this UI/UX feedback: "${featureRequest.feedback}". For reference, this is the screenshot of the UI concerned @screenshot-${requestId}.png.`;
    
    console.log(`Saved feedback #${requestId} to ${rootFolder}`);
    
    res.json({
      success: true,
      requestId,
      screenshotPath,
      prompt
    });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save feedback' 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Vibe Coding Feedback Agent running on http://localhost:${PORT}`);
  console.log('Make sure your Chrome extension is configured to use this agent.');
}); 