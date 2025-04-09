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
  ChevronDown 
} from 'lucide-react';

export function MoveFileDialog({ 
  isOpen, 
  onClose, 
  folders = [], 
  onMoveFiles, 
  selectedFiles = [] 
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
  const handleMove = () => {
    onMoveFiles(selectedFiles.map(f => f.fileId), selectedFolderId);
    onClose();
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
          <DialogTitle>Move {selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'file'}</DialogTitle>
          <DialogDescription>
            Select a destination folder
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[300px] overflow-y-auto">
          <div className="pl-1 py-2">
            <div 
              className={`flex items-center p-1 mb-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedFolderId === null ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
              onClick={() => handleSelectFolder(null)}
            >
              <FolderIcon className="h-4 w-4 mr-2 text-blue-400" />
              <span className="text-sm">Home (Root)</span>
            </div>
            
            {renderFolders(null)}
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMove}>
            Move {selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'file'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 