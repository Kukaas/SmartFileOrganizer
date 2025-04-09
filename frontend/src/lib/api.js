import { getDeviceFingerprint } from './deviceFingerprint';

// Use environment variable for API URL with fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Helper function to make API calls with device fingerprint
const apiCall = async (endpoint, options = {}) => {
  const fingerprint = await getDeviceFingerprint();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': fingerprint.deviceId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

// Function to convert file object to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// API functions
export const api = {
  // Sync files with the server
  syncFiles: async (files) => {
    // Map files to ensure they have the correct format for the server
    const serverFiles = await Promise.all(files.map(async (file) => {
      // Basic file info
      const fileData = {
        ...file,
        fileId: file.fileId || file.id, // Use fileId if available, fallback to id
      };
      
      // Add file content as base64 if it's a file object
      if (file instanceof File || file instanceof Blob) {
        try {
          fileData.content = await fileToBase64(file);
        } catch (error) {
          console.error('Error converting file to base64:', error);
        }
      } else if (file._file instanceof File || file._file instanceof Blob) {
        // Handle case where file might be wrapped in an object
        try {
          fileData.content = await fileToBase64(file._file);
        } catch (error) {
          console.error('Error converting file to base64:', error);
        }
      }
      
      return fileData;
    }));

    return apiCall('/files/sync', {
      method: 'POST',
      body: JSON.stringify({ files: serverFiles }),
    });
  },

  // Get files for the current device
  getFiles: async () => {
    return apiCall('/files');
  },

  // Update file metadata (tags, name, etc.)
  updateFile: async (file, updates) => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    // Handle file content updates
    const updatesWithContent = { ...updates };
    
    // Check if there's a file object to upload
    if (updates.file && (updates.file instanceof File || updates.file instanceof Blob)) {
      try {
        updatesWithContent.content = await fileToBase64(updates.file);
        delete updatesWithContent.file; // Remove the file object
      } catch (error) {
        console.error('Error converting file to base64:', error);
      }
    }
    
    // Send only the updates, not the entire file
    const response = await apiCall(`/files/${file.fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updatesWithContent,
        fileId: file.fileId // Ensure fileId is preserved
      }),
    });

    return response;
  },

  // Download a file
  downloadFile: async (file) => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    const fileData = await apiCall(`/files/${file.fileId}/download`);
    
    if (!fileData.content) {
      throw new Error('File content not available');
    }
    
    // Convert base64 to blob
    const contentType = file.type || 'application/octet-stream';
    const byteCharacters = atob(fileData.content);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: contentType });
    return {
      blob,
      fileName: fileData.name,
      fileType: fileData.type
    };
  },

  // Analyze a file with AI
  analyzeFile: async (file, service = 'both') => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    return apiCall(`/files/${file.fileId}/analyze?service=${service}&type=analyze`, {
      method: 'POST'
    });
  },

  // Summarize a file with AI
  summarizeFile: async (file) => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    return apiCall(`/files/${file.fileId}/analyze?service=gemini&type=summarize`, {
      method: 'POST'
    });
  },

  // Get file analysis
  getFileAnalysis: async (file) => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    return apiCall(`/files/${file.fileId}/analysis`);
  },

  // Delete a file
  deleteFile: async (file) => {
    if (!file || !file.fileId) {
      throw new Error('Invalid file object: missing fileId');
    }
    
    return apiCall(`/files/${file.fileId}`, {
      method: 'DELETE',
    });
  },

  // Get device info and stats
  getDeviceInfo: async () => {
    return apiCall('/device/info');
  },
}; 