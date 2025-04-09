import { getDeviceFingerprint } from './deviceFingerprint';

const API_BASE_URL = 'http://localhost:3000/api';

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

// API functions
export const api = {
  // Sync files with the server
  syncFiles: async (files) => {
    // Map files to ensure they have the correct format for the server
    const serverFiles = files.map(file => ({
      ...file,
      fileId: file.fileId || file.id, // Use fileId if available, fallback to id
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
    
    // Send only the updates, not the entire file
    const response = await apiCall(`/files/${file.fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updates,
        fileId: file.fileId // Ensure fileId is preserved
      }),
    });

    return response;
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