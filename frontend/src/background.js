// Initialize context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "organize-file",
    title: "Add to Smart File Organizer",
    contexts: ["link", "image", "video", "audio"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "organize-file") {
    let fileUrl = info.srcUrl || info.linkUrl;
    if (fileUrl) {
      processFile(fileUrl);
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_FILE') {
    processFile(message.url);
  }
});

// Process and store file information
async function processFile(url) {
  try {
    // Get file metadata
    const response = await fetch(url);
    const blob = await response.blob();
    const fileName = url.split('/').pop();
    
    // Generate file metadata
    const fileInfo = {
      id: generateUniqueId(),
      name: fileName,
      type: blob.type,
      size: blob.size,
      url: url,
      dateAdded: new Date().toISOString(),
      tags: generateInitialTags(fileName, blob.type),
      status: 'pending_analysis'
    };

    // Store file info
    chrome.storage.local.get(['files'], function(result) {
      const files = result.files || [];
      const updatedFiles = [...files, fileInfo];
      chrome.storage.local.set({ files: updatedFiles }, () => {
        // Notify any open popup about the new file
        chrome.runtime.sendMessage({
          type: 'FILE_ADDED',
          file: fileInfo
        });
      });
    });

  } catch (error) {
    console.error('Error processing file:', error);
  }
}

// Generate a unique ID for each file
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate initial tags based on file type and name
function generateInitialTags(fileName, fileType) {
  const tags = [];
  
  // Add file type tag
  const mainType = fileType.split('/')[0];
  tags.push(mainType);
  
  // Add extension tag
  const extension = fileName.split('.').pop().toLowerCase();
  if (extension) {
    tags.push(extension);
  }
  
  return tags;
} 