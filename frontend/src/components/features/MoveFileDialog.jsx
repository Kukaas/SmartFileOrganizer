import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FolderIcon, 
  ChevronRight, 
  ChevronDown,
  HomeIcon,
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MoveFileDialog({ 
  isOpen, 
  onClose, 
  folders = [], 
  onMoveFiles, 
  selectedFiles = [], 
  isMoving = false 
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  
  // Toggle expanded state of a folder
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  // Handle folder selection
  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
  };
  
  // Handle moving the file(s)
  const handleMoveFiles = () => {
    // Extract file IDs from selected files
    const fileIds = selectedFiles.map(file => file.fileId);
    
    // Call the move files function with the selected folder ID
    onMoveFiles(fileIds, selectedFolderId);
  };
  
  // Recursive function to render folder tree
  const renderFolders = (parentId = null) => {
    const childFolders = folders.filter(folder => folder.parentId === parentId);
    
    if (childFolders.length === 0) return null;
    
    return (
      <ul className={`pl-4 ${parentId ? 'ml-2 border-l border-gray-200 dark:border-gray-700' : ''}`}>
        {childFolders.map(folder => (
          <li key={folder.folderId} className="py-1">
            <div className={`flex items-center ${selectedFolderId === folder.folderId ? 'bg-blue-100 dark:bg-blue-900 rounded' : ''}`}>
              <button 
                className="p-1 opacity-70 hover:opacity-100 focus:outline-none"
                onClick={() => toggleFolder(folder.folderId)}
              >
                {expandedFolders[folder.folderId] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              <div 
                className="flex-1 flex items-center p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSelectFolder(folder.folderId)}
              >
                <FolderIcon className="h-4 w-4 mr-2 text-yellow-400" />
                <span className="text-sm">{folder.name}</span>
              </div>
            </div>
            
            {expandedFolders[folder.folderId] && renderFolders(folder.folderId)}
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Files</DialogTitle>
          <DialogDescription>
            Select a destination folder for {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-2">
              {/* Home (root) folder option */}
              <button
                className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${selectedFolderId === null ? 'bg-primary/10 border-primary border dark:bg-primary/20' : ''}`}
                onClick={() => setSelectedFolderId(null)}
              >
                <HomeIcon className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium">Home</span>
              </button>
              
              {/* List of folders */}
              {folders.map((folder) => (
                <button
                  key={folder.folderId}
                  className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${selectedFolderId === folder.folderId ? 'bg-primary/10 border-primary border dark:bg-primary/20' : ''}`}
                  onClick={() => setSelectedFolderId(folder.folderId)}
                >
                  <FolderIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">{folder.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMoveFiles}
            disabled={isMoving} 
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white"
          >
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              'Move Files'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 