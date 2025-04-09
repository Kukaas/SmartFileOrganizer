import { useState, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/features/FileUpload';
import { FileGrid } from '@/components/features/FileGrid';
import { SearchBar } from '@/components/features/SearchBar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

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
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
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
        setSyncError('Failed to load files from server');
        
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
            setSyncError('Changes will be synced when connection is restored');
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
        
        // Determine file type, accounting for PDFs
        let fileType = file.type;
        if (fileExtension === 'pdf' && !file.type.includes('pdf')) {
          fileType = 'application/pdf';
        }
        
        // Generate appropriate tags
        const tags = [];
        
        // Add main type tag
        const mainType = fileType.split('/')[0];
        tags.push(mainType);
        
        // Add file extension
        if (fileExtension) {
          tags.push(fileExtension);
        }
        
        // Add document tag for PDFs
        if (fileExtension === 'pdf' || fileType === 'application/pdf') {
          tags.push('document');
        }
        
        return {
          id: fileId, 
          fileId: fileId,
          name: file.name,
          type: fileType,
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
          setSyncError('Changes will be synced when connection is restored');
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
      // In a real app, you would call your AI service here
      console.log('Analyzing file:', file.name);
      
      // Example of updating file metadata to show analysis was performed
      const updatedFile = await api.updateFile(file, { 
        status: 'analyzed',
        lastAnalyzed: new Date().toISOString()
      });
      
      // Update state with analysis info
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'analyzed',
          lastAnalyzed: new Date().toISOString()
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'analyzed',
            lastAnalyzed: new Date().toISOString()
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
    } catch (error) {
      console.error('Error analyzing file:', error);
      setSyncError('Failed to analyze file');
    }
  };
  
  const handleSummarize = async (file) => {
    try {
      // In a real app, you would call your AI service here
      console.log('Summarizing file:', file.name);
      
      // Example of updating file metadata to show summary was performed
      const updatedFile = await api.updateFile(file, { 
        status: 'summarized',
        lastSummarized: new Date().toISOString()
      });
      
      // Update state with summary info
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'summarized',
          lastSummarized: new Date().toISOString()
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'summarized',
            lastSummarized: new Date().toISOString()
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
    } catch (error) {
      console.error('Error summarizing file:', error);
      setSyncError('Failed to summarize file');
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

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check file type for filtering
    let matchesFilter = filterType === 'all';
    
    if (filterType === 'image') {
      matchesFilter = file.type.startsWith('image/');
    } 
    else if (filterType === 'document') {
      matchesFilter = file.type.includes('document') || 
                      file.type === 'application/pdf' || 
                      file.name.toLowerCase().endsWith('.pdf') ||
                      file.type.includes('text');
    }
    else if (filterType === 'media') {
      matchesFilter = file.type.startsWith('video/') || file.type.startsWith('audio/');
    }
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative h-[600px] w-[800px]">
      <div className="absolute top-0 left-0 right-0 z-10 bg-white pt-4 px-4 pb-2 border-b border-gray-100 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Smart File Organizer</h1>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
              {syncError && (
                <div className="text-sm text-yellow-600">
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
        />
      </div>
    </div>
  );
}

export default App;
