import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useFolderHandlers() {
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Handle folder selection
  const handleFolderSelect = async (folderId) => {
    setCurrentFolderId(folderId);
    // Clear selections will be handled by the component using this hook
  };
  
  // Create a new folder
  const handleCreateFolder = async (name, parentId = null) => {
    try {
      setIsLoading(true);
      const updatedFolders = await api.createFolder(name, parentId);
      setFolders(updatedFolders);
      
      // Update local storage
      await chrome.storage.local.set({ folders: updatedFolders });
      
      setSyncError(null);
      toast.success(`Folder "${name}" created successfully`);
      return updatedFolders;
    } catch (error) {
      console.error('Error creating folder:', error);
      setSyncError('Failed to create folder');
      toast.error(`Failed to create folder: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rename a folder
  const handleRenameFolder = async (folderId, newName) => {
    try {
      setIsLoading(true);
      const updatedFolders = await api.updateFolder(folderId, { name: newName });
      setFolders(updatedFolders);
      
      // Update local storage
      await chrome.storage.local.set({ folders: updatedFolders });
      
      setSyncError(null);
      toast.success(`Folder renamed to "${newName}"`);
      return updatedFolders;
    } catch (error) {
      console.error('Error renaming folder:', error);
      setSyncError('Failed to rename folder');
      toast.error(`Failed to rename folder: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a folder
  const handleDeleteFolder = async (folderId) => {
    try {
      setIsLoading(true);
      // Get the folder name before deleting
      const folderToDelete = folders.find(f => f.folderId === folderId);
      const folderName = folderToDelete ? folderToDelete.name : 'folder';
      
      const updatedFolders = await api.deleteFolder(folderId);
      setFolders(updatedFolders);
      
      // If we're currently in that folder, go back to root
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      
      // Update local storage
      await chrome.storage.local.set({ folders: updatedFolders });
      
      setSyncError(null);
      toast.success(`Folder "${folderName}" deleted successfully`);
      return updatedFolders;
    } catch (error) {
      console.error('Error deleting folder:', error);
      setSyncError('Failed to delete folder');
      toast.error(`Failed to delete folder: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Move files to a folder
  const handleMoveFiles = async (fileIds, targetFolderId, refreshFiles) => {
    try {
      setIsLoading(true);
      // Get the target folder name
      const targetFolder = folders.find(f => f.folderId === targetFolderId);
      const targetName = targetFolder ? targetFolder.name : 'destination folder';
      
      const updatedFiles = await api.moveFilesToFolder(fileIds, targetFolderId);
      
      // Refresh file list after move
      if (typeof refreshFiles === 'function') {
        await refreshFiles();
      }
      
      setSyncError(null);
      toast.success(`${fileIds.length} file(s) moved to ${targetFolderId ? `"${targetName}"` : 'Home'}`);
      
      return updatedFiles;
    } catch (error) {
      console.error('Error moving files:', error);
      setSyncError('Failed to move files');
      toast.error(`Failed to move files: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    folders,
    setFolders,
    currentFolderId,
    setCurrentFolderId,
    isLoading,
    setIsLoading,
    syncError,
    setSyncError,
    handleFolderSelect,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveFiles
  };
} 