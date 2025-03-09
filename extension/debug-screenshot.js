/**
 * Debug Utility for Screenshot Capture Issues
 * 
 * This script can be injected into the page to diagnose screenshot selection issues.
 * To use it, copy this code into the browser console on the page where screenshot
 * capture is not working correctly.
 */

(function() {
  // Create debug overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  overlay.style.color = '#fff';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '14px';
  overlay.style.zIndex = '999999';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.overflow = 'auto';
  
  // Add debug info
  const infoDiv = document.createElement('div');
  infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  infoDiv.style.padding = '15px';
  infoDiv.style.borderRadius = '5px';
  infoDiv.style.marginBottom = '20px';
  infoDiv.style.maxWidth = '600px';
  
  // Device info
  const devicePixelRatio = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const docWidth = document.documentElement.scrollWidth;
  const docHeight = document.documentElement.scrollHeight;
  
  infoDiv.innerHTML = `
    <h2 style="margin-top: 0;">Screenshot Debug Info</h2>
    <div>Device Pixel Ratio: <strong>${devicePixelRatio}</strong></div>
    <div>Viewport Size: <strong>${viewportWidth}px × ${viewportHeight}px</strong></div>
    <div>Document Size: <strong>${docWidth}px × ${docHeight}px</strong></div>
    <div>Scroll Position: <strong>${scrollX}px, ${scrollY}px</strong></div>
    <br>
    <div>Click and drag to see selection coordinates</div>
    <div>Press ESC to close this debug overlay</div>
  `;
  
  overlay.appendChild(infoDiv);
  
  // Add selection info container
  const selectionInfo = document.createElement('div');
  selectionInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  selectionInfo.style.padding = '15px';
  selectionInfo.style.borderRadius = '5px';
  selectionInfo.style.maxWidth = '600px';
  selectionInfo.style.display = 'none';
  overlay.appendChild(selectionInfo);
  
  // Add selection box
  const selectionBox = document.createElement('div');
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
  selectionBox.style.display = 'none';
  overlay.appendChild(selectionBox);
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Selection variables
  let startX, startY;
  let isDragging = false;
  
  // Events
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0';
      selectionBox.style.height = '0';
      selectionBox.style.display = 'block';
    }
  });
  
  overlay.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const width = e.clientX - startX;
      const height = e.clientY - startY;
      
      // Update selection box
      if (width < 0) {
        selectionBox.style.left = `${e.clientX}px`;
        selectionBox.style.width = `${-width}px`;
      } else {
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.width = `${width}px`;
      }
      
      if (height < 0) {
        selectionBox.style.top = `${e.clientY}px`;
        selectionBox.style.height = `${-height}px`;
      } else {
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.height = `${height}px`;
      }
    }
  });
  
  overlay.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      
      // Get coordinates
      const left = parseInt(selectionBox.style.left);
      const top = parseInt(selectionBox.style.top);
      const width = parseInt(selectionBox.style.width);
      const height = parseInt(selectionBox.style.height);
      
      // Calculate scaled coordinates based on device pixel ratio
      const scaledX = Math.round(left * devicePixelRatio);
      const scaledY = Math.round(top * devicePixelRatio);
      const scaledWidth = Math.round(width * devicePixelRatio);
      const scaledHeight = Math.round(height * devicePixelRatio);
      
      // Show selection info
      selectionInfo.style.display = 'block';
      selectionInfo.innerHTML = `
        <h3>Selection Coordinates</h3>
        <div>Selection (CSS px): <strong>${left}, ${top}, ${width} × ${height}</strong></div>
        <div>Selection (Device px): <strong>${scaledX}, ${scaledY}, ${scaledWidth} × ${scaledHeight}</strong></div>
        <div>Absolute Position: <strong>${left + scrollX}, ${top + scrollY}</strong></div>
        <br>
        <div>For offscreen.js, use these values:</div>
        <pre style="background: #222; padding: 10px; overflow: auto;">
const dpr = ${devicePixelRatio};
const selection = { 
  x: ${left}, 
  y: ${top}, 
  width: ${width}, 
  height: ${height} 
};
        </pre>
      `;
    }
  });
  
  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
    }
  });
  
  console.log('Screenshot debug overlay active. Press ESC to close.');
})(); 