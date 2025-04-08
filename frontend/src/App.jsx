import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/features/FileUpload';
import { FileGrid } from '@/components/features/FileGrid';
import { SearchBar } from '@/components/features/SearchBar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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

  // Load files from Chrome storage
  useEffect(() => {
    // Add scrollbar styles to document
    const style = document.createElement('style');
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);

    chrome.storage.local.get(['files'], function(result) {
      setFiles(result.files || []);
      setIsLoading(false);
    });

    // Listen for storage changes
    const handleStorageChange = (changes) => {
      if (changes.files) {
        setFiles(changes.files.newValue || []);
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
      const filePromises = newFiles.map(async (file) => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: file.name,
        type: file.type,
        size: file.size,
        dateAdded: new Date().toISOString(),
        tags: [file.type.split('/')[0], file.name.split('.').pop().toLowerCase()],
        status: 'pending_analysis',
        // Create object URL for local files
        url: URL.createObjectURL(file)
      }));

      const processedFiles = await Promise.all(filePromises);

      chrome.storage.local.get(['files'], function(result) {
        const existingFiles = result.files || [];
        const updatedFiles = [...existingFiles, ...processedFiles];
        chrome.storage.local.set({ files: updatedFiles });
      });
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (fileToDelete) => {
    chrome.storage.local.get(['files'], function(result) {
      const updatedFiles = (result.files || []).filter(file => file.id !== fileToDelete.id);
      chrome.storage.local.set({ files: updatedFiles });
    });
  };

  const handleRename = (file, newName) => {
    chrome.storage.local.get(['files'], function(result) {
      const updatedFiles = (result.files || []).map(f => 
        f.id === file.id ? { ...f, name: newName } : f
      );
      chrome.storage.local.set({ files: updatedFiles });
    });
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
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
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
