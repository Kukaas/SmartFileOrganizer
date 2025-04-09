import { useState, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/features/FileUpload';
import { FileGrid } from '@/components/features/FileGrid';
import { SearchBar } from '@/components/features/SearchBar';
import { FoldersList } from '@/components/features/FoldersList';
import { MoveFileDialog } from '@/components/features/MoveFileDialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, FolderIcon, MoveIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { regenerateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';

// Add custom scrollbar styles
const scrollbarStyles = `
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .dark ::-webkit-scrollbar-thumb {
    background: #475569;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .dark ::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
`;

function App() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  // Load files and folders from server
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

    // Add scrollbar styles
    const style = document.createElement('style');
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);

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
      document.head.removeChild(style);
    };
  }, [currentFolderId]); // Re-fetch when folder changes

  const handleFilesSelected = async (newFiles) => {
    setIsLoading(true);
    try {
      const filePromises = newFiles.map(async (file) => {
        const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Determine file type
        let fileType = file.type;
        
        // Handle common file types that might have incorrect MIME types
        if (fileExtension && (!fileType || fileType === 'application/octet-stream')) {
          const extensionTypeMappings = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain',
            'js': 'text/javascript',
            'py': 'text/x-python',
            'md': 'text/markdown',
            'env': 'text/plain',
            'json': 'application/json',
            'csv': 'text/csv',
            'xml': 'application/xml',
            'zip': 'application/zip',
            'rar': 'application/vnd.rar',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
          };
          
          if (extensionTypeMappings[fileExtension]) {
            fileType = extensionTypeMappings[fileExtension];
          }
        }
        
        // Generate appropriate tags
        const tags = [];
        
        // Add main type tag if available
        if (fileType && fileType.includes('/')) {
          const mainType = fileType.split('/')[0];
          tags.push(mainType);
        }
        
        // Add file extension
        if (fileExtension) {
          tags.push(fileExtension);
        }
        
        // Add category tags based on extension or type
        if (fileExtension === 'pdf' || fileType === 'application/pdf' || 
            fileExtension === 'docx' || fileExtension === 'doc' || 
            fileExtension === 'txt' || fileExtension === 'md') {
          tags.push('document');
        } else if (fileExtension === 'js' || fileExtension === 'py' || 
                  fileExtension === 'java' || fileExtension === 'c' || 
                  fileExtension === 'cpp' || fileExtension === 'cs' || 
                  fileExtension === 'html' || fileExtension === 'css' || 
                  fileExtension === 'php' || fileExtension === 'rb') {
          tags.push('code');
        } else if (fileExtension === 'zip' || fileExtension === 'rar' || 
                  fileExtension === 'tar' || fileExtension === 'gz' || 
                  fileExtension === '7z') {
          tags.push('archive');
        } else if (fileType && fileType.startsWith('image/')) {
          tags.push('image');
        } else if (fileType && fileType.startsWith('video/')) {
          tags.push('video');
        } else if (fileType && fileType.startsWith('audio/')) {
          tags.push('audio');
        }
        
        return {
          id: fileId, 
          fileId: fileId,
          name: file.name,
          type: fileType || 'application/octet-stream', // Default type if none detected
          size: file.size,
          dateAdded: new Date().toISOString(),
          tags: tags,
          status: 'pending_analysis',
          url: URL.createObjectURL(file),
          _file: file, // Keep the original file object for content processing
        };
      });

      const processedFiles = await Promise.all(filePromises);

      // Update local storage and trigger sync
      chrome.storage.local.get(['files'], async function(result) {
        const existingFiles = result.files || [];
        const updatedFiles = [...existingFiles, ...processedFiles];
        await chrome.storage.local.set({ files: updatedFiles });
        
        // Sync with server
        try {
          const serverFiles = await api.syncFiles(processedFiles);
          setSyncError(null);
        } catch (error) {
          console.error('Error syncing with server:', error);
          
          // Set a more specific error message if it's a MongoDB duplicate key error
          if (error.message.includes('duplicate key error') || 
              (typeof error === 'object' && error.code === 11000)) {
            setSyncError('Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing local storage or device fingerprint.');
          } else {
            setSyncError('Changes will be synced when connection is restored');
          }
        }
      });
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileToDelete) => {
    try {
      if (!fileToDelete.fileId) {
        console.error('Cannot delete file without fileId:', fileToDelete);
        setSyncError('Failed to delete file: Invalid file ID');
        toast.error('Failed to delete file: Invalid file ID');
        return;
      }

      // Delete from server first
      await api.deleteFile(fileToDelete);
      
      // Update state immediately
      setFiles(currentFiles => currentFiles.filter(file => file.fileId !== fileToDelete.fileId));
      
      // Then update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).filter(file => file.fileId !== fileToDelete.fileId);
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      setSyncError(null);
      toast.success(`File "${fileToDelete.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting file:', error);
      setSyncError('Failed to delete file from server');
      toast.error('Failed to delete file from server');
    }
  };

  const handleRename = async (file, newName) => {
    try {
      if (!file.fileId) {
        console.error('Cannot rename file without fileId:', file);
        setSyncError('Failed to rename file: Invalid file ID');
        toast.error('Failed to rename file: Invalid file ID');
        return;
      }

      // Update on server first
      const updatedFile = await api.updateFile(file, { name: newName });
      
      // Update state immediately
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { ...f, name: newName } : f)
      );
      
      // Then update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { ...f, name: newName } : f
        );
        chrome.storage.local.set({ files: updatedFiles }, () => {
          // Clear any error state after successful update
          setSyncError(null);
        });
      });
      
      toast.success(`File renamed to "${newName}"`);
    } catch (error) {
      console.error('Error renaming file:', error);
      setSyncError('Failed to update file on server');
      toast.error('Failed to update file on server');
      
      // Revert the state if server update failed
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { ...f, name: file.name } : f)
      );
    }
  };
  
  const handleAnalyze = async (file) => {
    try {
      setSyncError(null);
      
      // Call the AI service to analyze the file
      const analysisResult = await api.analyzeFile(file);
      
      // Update local state with analysis status
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'analyzed',
          lastAnalyzed: new Date().toISOString(),
          analysis: analysisResult
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'analyzed',
            lastAnalyzed: new Date().toISOString(),
            analysis: analysisResult
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      toast.success(`Analysis complete for "${file.name}"`);
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing file:', error);
      
      // Update file status to error in local state
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'error',
          error: error.message || 'Unknown error during analysis'
        } : f)
      );
      
      // Update local storage with error status
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'error',
            error: error.message || 'Unknown error during analysis'
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      // Create a more detailed error message based on the error
      let errorMessage = 'Failed to analyze file';
      
      if (error.message) {
        if (error.message.includes('API call failed')) {
          errorMessage = 'Server connection error during analysis';
        } else if (error.message.includes('File content not available')) {
          errorMessage = 'File content is missing or corrupted';
        } else if (error.message.includes('Hugging Face API key is missing') || 
                  error.message.includes('Gemini API key is missing')) {
          errorMessage = 'AI service configuration error';
        } else if (error.message.includes('Unsupported file type')) {
          // Provide more specific guidance about supported file types
          const fileExt = file.name.split('.').pop().toLowerCase();
          if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
            errorMessage = `Document analysis error: Unable to extract text from this ${fileExt.toUpperCase()} file. The file may be password-protected, corrupted, or contain only scanned images.`;
          } else {
            errorMessage = `This file type (${fileExt}) is not supported for analysis. Supported document types include TXT, PDF, DOC, and DOCX files.`;
          }
        } else {
          errorMessage = `Analysis failed: ${error.message}`;
        }
      }
      
      setSyncError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };
  
  const handleSummarize = async (file) => {
    try {
      setSyncError(null);
      
      // Call the AI service to summarize the file
      const summaryResult = await api.summarizeFile(file);
      
      // Update local state with summary status
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'analyzed',
          lastSummarized: new Date().toISOString(),
          summary: summaryResult.summary
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'analyzed',
            lastSummarized: new Date().toISOString(),
            summary: summaryResult.summary
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      toast.success(`Summary complete for "${file.name}"`);
      return summaryResult;
    } catch (error) {
      console.error('Error summarizing file:', error);
      
      // Update file status to error in local state
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'error',
          error: error.message || 'Unknown error during summarization'
        } : f)
      );
      
      // Update local storage with error status
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'error',
            error: error.message || 'Unknown error during summarization'
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      // Create a more detailed error message based on the error
      let errorMessage = 'Failed to summarize file';
      
      if (error.message) {
        if (error.message.includes('API call failed')) {
          errorMessage = 'Server connection error during summarization';
        } else if (error.message.includes('File content not available')) {
          errorMessage = 'File content is missing or corrupted';
        } else if (error.message.includes('Gemini API key is missing')) {
          errorMessage = 'AI service configuration error';
        } else if (error.message.includes('Unsupported file type')) {
          // Provide more specific guidance about supported file types
          const fileExt = file.name.split('.').pop().toLowerCase();
          if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
            errorMessage = `Document summarization error: Unable to extract text from this ${fileExt.toUpperCase()} file. The file may be password-protected, corrupted, or contain only scanned images.`;
          } else {
            errorMessage = `This file type (${fileExt}) is not supported for summarization. Supported document types include TXT, PDF, DOC, and DOCX files.`;
          }
        } else {
          errorMessage = `Summarization failed: ${error.message}`;
        }
      }
      
      setSyncError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleDownload = async (file) => {
    try {
      // Download the file from server
      const { blob, fileName } = await api.downloadFile(file);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || file.name;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setSyncError(null);
      toast.success(`Downloaded "${file.name}" successfully`);
      return { success: true };
    } catch (error) {
      console.error('Error downloading file:', error);
      setSyncError('Failed to download file from server');
      toast.error('Failed to download file from server');
      throw error; // Rethrow the error to allow .catch in the caller
    }
  };

  const handleFixDeviceIDConflict = async () => {
    try {
      setIsLoading(true);
      
      // Regenerate device fingerprint
      const newFingerprint = await regenerateDeviceFingerprint();
      
      // Update local storage
      chrome.storage.local.set({ deviceFingerprint: newFingerprint });
      
      // Load files from server again
      const serverFiles = await api.getFiles();
      
      // Update local state and storage
      setFiles(serverFiles);
      await chrome.storage.local.set({ files: serverFiles });
      
      setSyncError(null);
    } catch (error) {
      console.error('Error fixing device ID conflict:', error);
      setSyncError('Failed to fix device ID conflict');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle folder selection
  const handleFolderSelect = async (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedFiles([]); // Clear selections when changing folders
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
      
      // Refresh files if we were in the deleted folder
      if (currentFolderId === folderId) {
        const updatedFiles = await api.getFiles(null);
        setFiles(updatedFiles);
        await chrome.storage.local.set({ files: updatedFiles });
      }
      
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
  
  // Open the move dialog for selected files
  const handleOpenMoveDialog = () => {
    if (selectedFiles.length > 0) {
      setIsMoveDialogOpen(true);
    }
  };
  
  // Move files to a folder
  const handleMoveFiles = async (fileIds, targetFolderId) => {
    try {
      setIsLoading(true);
      // Get the target folder name
      const targetFolder = folders.find(f => f.folderId === targetFolderId);
      const targetName = targetFolder ? targetFolder.name : 'destination folder';
      
      const updatedFiles = await api.moveFilesToFolder(fileIds, targetFolderId);
      
      // Refresh file list after move
      const newFiles = await api.getFiles(currentFolderId);
      setFiles(newFiles);
      
      // Update local storage
      await chrome.storage.local.set({ files: newFiles });
      
      // Clear selections after move
      setSelectedFiles([]);
      
      setSyncError(null);
      toast.success(`${fileIds.length} file(s) moved to ${targetFolderId ? `"${targetName}"` : 'Home'}`);
    } catch (error) {
      console.error('Error moving files:', error);
      setSyncError('Failed to move files');
      toast.error(`Failed to move files: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle file selection
  const handleToggleFileSelection = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.fileId === file.fileId);
      
      if (isSelected) {
        return prev.filter(f => f.fileId !== file.fileId);
      } else {
        return [...prev, file];
      }
    });
  };

  // Filter files for the current view
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check file type for filtering
    let matchesFilter = filterType === 'all';
    
    if (filterType === 'image') {
      matchesFilter = file.type.startsWith('image/') || file.tags?.includes('image');
    } 
    else if (filterType === 'document') {
      matchesFilter = file.type.includes('document') || 
                      file.type === 'application/pdf' || 
                      file.name.toLowerCase().endsWith('.pdf') ||
                      file.type.includes('text') ||
                      file.tags?.includes('document');
    }
    else if (filterType === 'media') {
      matchesFilter = file.type.startsWith('video/') || 
                      file.type.startsWith('audio/') ||
                      file.tags?.includes('video') ||
                      file.tags?.includes('audio');
    }
    else if (filterType === 'archive') {
      matchesFilter = file.type.includes('zip') || 
                      file.type.includes('archive') ||
                      file.type.includes('compressed') ||
                      file.tags?.includes('archive');
    }
    else if (filterType === 'code') {
      matchesFilter = file.tags?.includes('code');
    }
    
    return matchesSearch && matchesFilter;
  });

  // Get current folder name
  const currentFolderName = currentFolderId 
    ? folders.find(f => f.folderId === currentFolderId)?.name || 'Unknown Folder'
    : 'Home';

  return (
    <div className="relative h-[600px] w-[800px]">
      <div className="absolute top-0 left-0 right-0 z-10 bg-background pt-4 px-4 pb-2 border-b border-border shadow-sm">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Smart File Organizer</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {syncError && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  {syncError}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <FileUpload onFilesSelected={handleFilesSelected} />
          <SearchBar
            onSearch={setSearchQuery}
            onFilterChange={setFilterType}
          />
        </div>
      </div>

      <div className="absolute top-[220px] bottom-0 left-0 right-0 overflow-hidden">
        <div className="flex h-full">
          {/* Folders sidebar */}
          <div className="w-[220px] h-full p-4 border-r border-border overflow-y-auto">
            <FoldersList 
              folders={folders}
              currentFolderId={currentFolderId}
              onFolderSelect={handleFolderSelect}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
            />
          </div>
          
          {/* Files area */}
          <div className="flex-1 h-full flex flex-col">
            {/* Current folder header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center">
                <FolderIcon className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium">{currentFolderName}</span>
              </div>
              
              {selectedFiles.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={handleOpenMoveDialog}
                >
                  <MoveIcon className="h-3 w-3" />
                  Move {selectedFiles.length > 1 ? `${selectedFiles.length} files` : '1 file'}
                </Button>
              )}
            </div>
            
            {/* Files grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <FileGrid
                files={filteredFiles}
                selectedFiles={selectedFiles}
                onToggleSelect={handleToggleFileSelection}
                onDelete={handleDelete}
                onRename={handleRename}
                onAnalyze={handleAnalyze}
                onSummarize={handleSummarize}
                onDownload={handleDownload}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Move files dialog */}
      <MoveFileDialog
        isOpen={isMoveDialogOpen}
        onClose={() => setIsMoveDialogOpen(false)}
        folders={folders}
        selectedFiles={selectedFiles}
        onMoveFiles={handleMoveFiles}
      />

      {syncError === 'Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing local storage or device fingerprint.' && (
        <div className="absolute top-[100px] right-0 left-0 z-10 bg-background pt-4 px-4 pb-2 border-b border-border shadow-sm">
          <div className="flex items-center justify-center">
            <Button onClick={handleFixDeviceIDConflict}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fix Device ID Conflict
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
