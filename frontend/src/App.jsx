import { useState, useEffect } from 'react';
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
        return {
          id: fileId, // For frontend reference
          fileId: fileId, // For backend reference
          name: file.name,
          type: file.type,
          size: file.size,
          dateAdded: new Date().toISOString(),
          tags: [file.type.split('/')[0], file.name.split('.').pop().toLowerCase()],
          status: 'pending_analysis',
          url: URL.createObjectURL(file)
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
          await api.syncFiles(updatedFiles);
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

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'image' && file.type.startsWith('image/')) ||
      (filterType === 'document' && (
        file.type.includes('document') ||
        file.type.includes('pdf') ||
        file.type.includes('text')
      )) ||
      (filterType === 'media' && (
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/')
      ));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-[600px] w-[800px] overflow-y-auto p-4">
      <div className="space-y-4">
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

        <FileUpload onFilesSelected={handleFilesSelected} />

        <SearchBar
          onSearch={setSearchQuery}
          onFilterChange={setFilterType}
        />

        <FileGrid
          files={filteredFiles}
          onDelete={handleDelete}
          onRename={handleRename}
        />

        {!isLoading && filteredFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No files found. Add files by:</p>
            <ul className="mt-2">
              <li>Dragging and dropping files here</li>
              <li>Right-clicking on files/images in web pages</li>
              <li>Dragging files from web pages</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
