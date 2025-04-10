import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useDataSync(currentFolderId) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Load data from server on mount and when folder changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get files from server - filtered by current folder
        const serverFiles = await api.getFiles(currentFolderId);
        
        // Get folders from server
        const serverFolders = await api.getFolders();
        
        // Update local storage and state
        await chrome.storage.local.set({ 
          files: serverFiles,
          folders: serverFolders
        });
        
        setFiles(serverFiles);
        setFolders(serverFolders);
        setSyncError(null);
      } catch (error) {
        console.error('Error loading data:', error);
        
        // Set a more specific error message if it's a MongoDB duplicate key error
        const errorMessage = error.message.includes('duplicate key error')
          ? 'Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing your browser data.'
          : 'Failed to load data from server';
          
        setSyncError(errorMessage);
        
        // Fallback to local storage
        const { files: localFiles, folders: localFolders } = await chrome.storage.local.get(['files', 'folders']);
        setFiles(localFiles || []);
        setFolders(localFolders || []);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Listen for storage changes
    const handleStorageChange = async (changes) => {
      if (changes.files) {
        const newFiles = changes.files.newValue || [];
        
        // Only update state if files have actually changed
        if (JSON.stringify(newFiles) !== JSON.stringify(files)) {
          setFiles(newFiles);
        }
      }
      
      if (changes.folders) {
        const newFolders = changes.folders.newValue || [];
        
        // Only update state if folders have actually changed
        if (JSON.stringify(newFolders) !== JSON.stringify(folders)) {
          setFolders(newFolders);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Listen for new files added while popup is open
    const handleMessage = (message) => {
      if (message.type === 'FILE_ADDED') {
        setFiles(prev => [...prev, message.file]);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [currentFolderId]);

  // Function to refresh files for current folder
  const refreshFiles = async () => {
    try {
      setIsLoading(true);
      const serverFiles = await api.getFiles(currentFolderId);
      setFiles(serverFiles);
      await chrome.storage.local.set({ files: serverFiles });
      return serverFiles;
    } catch (error) {
      console.error('Error refreshing files:', error);
      setSyncError('Failed to refresh files from server');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    files,
    setFiles,
    folders,
    setFolders,
    isLoading,
    setIsLoading,
    syncError,
    setSyncError,
    refreshFiles
  };
} 