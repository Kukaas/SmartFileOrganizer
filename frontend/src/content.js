// Handle drag events
document.addEventListener('dragstart', function(event) {
  const url = event.target.src || event.target.href;
  if (url) {
    // Store the URL being dragged
    event.dataTransfer.setData('text/plain', url);
  }
});

// Handle drop events
document.addEventListener('drop', function(event) {
  const url = event.dataTransfer.getData('text/plain');
  if (url) {
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ADD_FILE',
      url: url
    });
  }
});

// Add context menu support for elements that might not have src or href
document.addEventListener('contextmenu', function(event) {
  const element = event.target;
  const url = element.src || element.href || element.currentSrc;
  
  if (url) {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_TARGET',
      url: url
    });
  }
}); 