import { useState } from 'react';
import { api } from '@/lib/api';
import { regenerateDeviceFingerprint } from '@/lib/deviceFingerprint';

export function useDeviceFingerprint() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleFixDeviceIDConflict = async (onFilesLoaded) => {
    try {
      setIsLoading(true);
      
      // Regenerate device fingerprint
      const newFingerprint = await regenerateDeviceFingerprint();
      
      // Update local storage
      chrome.storage.local.set({ deviceFingerprint: newFingerprint });
      
      // Load files from server again
      const serverFiles = await api.getFiles();
      
      // Update local storage
      await chrome.storage.local.set({ files: serverFiles });
      
      // Call callback if provided
      if (typeof onFilesLoaded === 'function') {
        onFilesLoaded(serverFiles);
      }
      
      setSyncError(null);
      return { success: true, files: serverFiles };
    } catch (error) {
      console.error('Error fixing device ID conflict:', error);
      setSyncError('Failed to fix device ID conflict');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading, 
    setIsLoading,
    syncError,
    setSyncError,
    handleFixDeviceIDConflict
  };
} 