const fs = require('fs');
const { createCanvas } = require('canvas');

// Create the images directory if it doesn't exist
try {
  fs.mkdirSync('images', { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Error creating images directory:', err);
    process.exit(1);
  }
}

// Color scheme
const colors = {
  background: '#4285F4',
  border: '#3367D6',
  bubble: '#FFFFFF',
  text: '#3367D6'
};

// Generate icon function
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Draw background circle
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  
  // Draw border
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - ctx.lineWidth/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.stroke();
  
  // Draw speech bubble
  const bubbleSize = size * 0.6;
  const bubbleX = size/2 - bubbleSize/2;
  const bubbleY = size/2 - bubbleSize/2;
  
  ctx.fillStyle = colors.bubble;
  ctx.beginPath();
  // Simplified rectangle since roundRect might not be available
  ctx.fillRect(bubbleX, bubbleY, bubbleSize, bubbleSize * 0.7);
  ctx.closePath();
  
  // Draw speech bubble tail
  ctx.beginPath();
  ctx.moveTo(bubbleX + bubbleSize * 0.25, bubbleY + bubbleSize * 0.7);
  ctx.lineTo(bubbleX + bubbleSize * 0.15, bubbleY + bubbleSize * 0.9);
  ctx.lineTo(bubbleX + bubbleSize * 0.35, bubbleY + bubbleSize * 0.7);
  ctx.closePath();
  ctx.fill();
  
  // Draw "V" text
  ctx.fillStyle = colors.text;
  ctx.font = `bold ${bubbleSize * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', size/2, size/2);
  
  // Return the buffer
  return canvas.toBuffer('image/png');
}

// Generate and save icons
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const iconBuffer = generateIcon(size);
  fs.writeFileSync(`images/icon${size}.png`, iconBuffer);
  console.log(`Generated icon${size}.png`);
});

console.log('All icons generated successfully!'); 