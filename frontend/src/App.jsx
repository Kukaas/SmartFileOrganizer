import { useState, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/features/FileUpload';
import { FileGrid } from '@/components/features/FileGrid';
import { SearchBar } from '@/components/features/SearchBar';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { regenerateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Load files from server and keep local storage in sync
  useEffect(() => {
    const loadFiles = async () => {
      try {
        // Get files from server
        const serverFiles = await api.getFiles();
        
        // Update local storage
        await chrome.storage.local.set({ files: serverFiles });
        setFiles(serverFiles);
      } catch (error) {
        console.error('Error loading files:', error);
        
        // Set a more specific error message if it's a MongoDB duplicate key error
        const errorMessage = error.message.includes('duplicate key error')
          ? 'Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing your browser data.'
          : 'Failed to load files from server';
          
        setSyncError(errorMessage);
        
        // Fallback to local storage
        const { files: localFiles } = await chrome.storage.local.get(['files']);
        setFiles(localFiles || []);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();

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
          
          // Sync with server
          try {
            const serverFiles = await api.syncFiles(newFiles);
            // Only update state if server response is different
            if (JSON.stringify(serverFiles) !== JSON.stringify(newFiles)) {
              setFiles(serverFiles);
            }
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
  }, []);

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
    } catch (error) {
      console.error('Error deleting file:', error);
      setSyncError('Failed to delete file from server');
    }
  };

  const handleRename = async (file, newName) => {
    try {
      if (!file.fileId) {
        console.error('Cannot rename file without fileId:', file);
        setSyncError('Failed to rename file: Invalid file ID');
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
    } catch (error) {
      console.error('Error renaming file:', error);
      setSyncError('Failed to update file on server');
      
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
      throw error;
    }
  };

  const handleDownload = async (file) => {
    try {
      setIsLoading(true);
      
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
    } catch (error) {
      console.error('Error downloading file:', error);
      setSyncError('Failed to download file from server');
    } finally {
      setIsLoading(false);
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

      <div className="absolute top-[220px] bottom-0 left-0 right-0 overflow-y-auto px-4 pb-4">
        <FileGrid
          files={filteredFiles}
          onDelete={handleDelete}
          onRename={handleRename}
          onAnalyze={handleAnalyze}
          onSummarize={handleSummarize}
          onDownload={handleDownload}
          isLoading={isLoading}
        />
      </div>

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
