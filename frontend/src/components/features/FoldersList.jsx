import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FolderIcon, 
  PlusCircle, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Pencil, 
  Trash2,
  FolderPlus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export function FoldersList({ 
  folders, 
  currentFolderId, 
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder 
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetParentId, setTargetParentId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const inputRef = useRef(null);
  
  // Truncate folder name if it's too long
  const truncateFolderName = (name, maxLength = 16) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };
  
  // Toggle expanded state of a folder
  const toggleFolder = (folderId, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  // Open dialog to create a new folder
  const handleNewFolder = (parentId = null, e) => {
    if (e) e.stopPropagation();
    setTargetParentId(parentId);
    setNewFolderName('');
    setErrorMessage('');
    setIsNewFolderDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening dialog
  };
  
  // Create the new folder
  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setErrorMessage('Folder name cannot be empty');
      toast.error('Folder name cannot be empty');
      return;
    }
    
    try {
      setIsCreating(true);
      setErrorMessage('');
      await onCreateFolder(newFolderName.trim(), targetParentId);
      setIsNewFolderDialogOpen(false);
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      setErrorMessage('Failed to create folder. Please try again.');
      setIsCreating(false);
    }
  }, [newFolderName, targetParentId, onCreateFolder]);
  
  // Open rename dialog
  const handleRenameFolder = (folder, e) => {
    if (e) e.stopPropagation();
    setSelectedFolder(folder);
    setNewFolderName(folder.name);
    setErrorMessage('');
    setIsRenameFolderDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening dialog
  };
  
  // Rename the folder
  const renameFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setErrorMessage('Folder name cannot be empty');
      toast.error('Folder name cannot be empty');
      return;
    }
    
    if (selectedFolder && newFolderName.trim() !== selectedFolder.name) {
      try {
        setIsRenaming(true);
        setErrorMessage('');
        await onRenameFolder(selectedFolder.folderId, newFolderName.trim());
        setIsRenameFolderDialogOpen(false);
        setIsRenaming(false);
      } catch (error) {
        console.error('Error renaming folder:', error);
        setErrorMessage('Failed to rename folder. Please try again.');
        setIsRenaming(false);
      }
    } else {
      setIsRenameFolderDialogOpen(false);
    }
  }, [newFolderName, selectedFolder, onRenameFolder]);
  
  // Open delete confirmation dialog
  const handleDeleteFolder = (folder, e) => {
    if (e) e.stopPropagation();
    setSelectedFolder(folder);
    setErrorMessage('');
    setIsDeleteFolderDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening dialog
  };
  
  // Delete the folder
  const deleteFolder = useCallback(async () => {
    if (selectedFolder) {
      try {
        setIsDeleting(true);
        setErrorMessage('');
        await onDeleteFolder(selectedFolder.folderId);
        setIsDeleteFolderDialogOpen(false);
        setIsDeleting(false);
      } catch (error) {
        console.error('Error deleting folder:', error);
        setErrorMessage('Failed to delete folder. Please try again.');
        setIsDeleting(false);
      }
    }
  }, [selectedFolder, onDeleteFolder]);

  // Handle folder select
  const handleFolderSelect = (folderId, e) => {
    if (e) e.stopPropagation();
    if (onFolderSelect) {
      const selectedFolder = folders.find(f => f.folderId === folderId);
      const folderName = selectedFolder ? selectedFolder.name : 'Home';
      onFolderSelect(folderId);
    }
  };
  
  // Recursive function to render folder tree
  const renderFolders = (parentId = null) => {
    const childFolders = folders.filter(folder => folder.parentId === parentId);
    
    if (childFolders.length === 0) return null;
    
    return (
      <ul className={`pl-2 ${parentId ? 'ml-1 border-l border-gray-200 dark:border-gray-700' : ''}`}>
        {childFolders.map(folder => (
          <li key={folder.folderId} className="py-1">
            <div className={`flex items-center group ${currentFolderId === folder.folderId ? 'bg-gray-100 dark:bg-gray-800 rounded' : ''}`}>
              <button 
                className="p-0.5 opacity-70 hover:opacity-100 focus:outline-none flex-shrink-0"
                onClick={(e) => toggleFolder(folder.folderId, e)}
              >
                {expandedFolders[folder.folderId] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              <div 
                className="flex-1 flex items-center p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 min-w-0"
                onClick={(e) => handleFolderSelect(folder.folderId, e)}
              >
                <FolderIcon className="h-4 w-4 mr-2 text-yellow-400 flex-shrink-0" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm truncate max-w-[70px] inline-block">
                        {truncateFolderName(folder.name)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{folder.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="opacity-100 flex-shrink-0 ml-1">
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors"
                  aria-label="Folder options"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropdown = document.createElement('div');
                    dropdown.className = 'absolute bg-background border border-border rounded-md shadow-md z-50 py-1 min-w-[160px]';
                    dropdown.style.top = `${rect.bottom + 5}px`;
                    dropdown.style.left = `${rect.right - 160}px`; // Position to the left of the button
                    
                    // Create options
                    const newSubfolder = document.createElement('button');
                    newSubfolder.className = 'w-full text-left px-2 py-1.5 text-sm hover:bg-primary/10 flex items-center focus:bg-primary/10 rounded-sm my-1';
                    newSubfolder.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mr-2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>New Subfolder`;
                    
                    const renameFolder = document.createElement('button');
                    renameFolder.className = 'w-full text-left px-2 py-1.5 text-sm hover:bg-primary/10 flex items-center focus:bg-primary/10 rounded-sm my-1';
                    renameFolder.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mr-2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>Rename`;
                    
                    const separator = document.createElement('div');
                    separator.className = 'h-px bg-muted my-1 mx-1';
                    
                    const deleteFolder = document.createElement('button');
                    deleteFolder.className = 'w-full text-left px-2 py-1.5 text-sm hover:bg-destructive/10 flex items-center focus:bg-destructive/10 rounded-sm my-1 text-red-600';
                    deleteFolder.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>Delete`;

                    // Add title to dropdown
                    const titleLabel = document.createElement('div');
                    titleLabel.className = 'text-xs font-semibold text-muted-foreground pt-2 pb-1 px-3';
                    titleLabel.textContent = 'Folder Actions';
                    
                    const dangerLabel = document.createElement('div');
                    dangerLabel.className = 'text-xs font-semibold text-muted-foreground pt-2 pb-1 px-3';
                    dangerLabel.textContent = 'Danger Zone';
                    
                    // Append options to dropdown
                    dropdown.appendChild(titleLabel);
                    dropdown.appendChild(newSubfolder);
                    dropdown.appendChild(renameFolder);
                    dropdown.appendChild(separator);
                    dropdown.appendChild(dangerLabel);
                    dropdown.appendChild(deleteFolder);
                    
                    // Add event listeners
                    newSubfolder.addEventListener('click', (event) => {
                      document.body.removeChild(dropdown);
                      handleNewFolder(folder.folderId, event);
                    });
                    
                    renameFolder.addEventListener('click', (event) => {
                      document.body.removeChild(dropdown);
                      handleRenameFolder(folder, event);
                    });
                    
                    deleteFolder.addEventListener('click', (event) => {
                      document.body.removeChild(dropdown);
                      handleDeleteFolder(folder, event);
                    });
                    
                    // Close dropdown when clicking outside
                    const closeDropdown = (event) => {
                      if (!dropdown.contains(event.target) && event.target !== e.currentTarget) {
                        document.body.removeChild(dropdown);
                        document.removeEventListener('click', closeDropdown);
                      }
                    };
                    
                    document.addEventListener('click', closeDropdown);
                    
                    // Append dropdown to body
                    document.body.appendChild(dropdown);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {expandedFolders[folder.folderId] && renderFolders(folder.folderId)}
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => handleNewFolder(null, e)}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="w-full overflow-hidden">
        <div 
          className={`flex items-center p-1 mb-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${currentFolderId === null ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
          onClick={(e) => handleFolderSelect(null, e)}
        >
          <FolderIcon className="h-4 w-4 mr-2 text-blue-400" />
          <span className="text-sm truncate">Home</span>
        </div>
        
        {renderFolders(null)}
      </div>
      
      {/* New Folder Dialog */}
      <Dialog 
        open={isNewFolderDialogOpen} 
        onOpenChange={setIsNewFolderDialogOpen}
      >
        <DialogContent onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={inputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) createFolder();
              }}
            />
            {errorMessage && (
              <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsNewFolderDialogOpen(false)} 
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={createFolder} 
              disabled={isCreating || !newFolderName.trim()}
            >
              {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Folder Dialog */}
      <Dialog 
        open={isRenameFolderDialogOpen} 
        onOpenChange={setIsRenameFolderDialogOpen}
      >
        <DialogContent onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={inputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRenaming) renameFolder();
              }}
            />
            {errorMessage && (
              <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsRenameFolderDialogOpen(false)} 
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={renameFolder} 
              disabled={isRenaming || !newFolderName.trim() || (selectedFolder && newFolderName.trim() === selectedFolder.name)}
            >
              {isRenaming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Renaming...</> : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Folder Dialog */}
      <Dialog 
        open={isDeleteFolderDialogOpen} 
        onOpenChange={setIsDeleteFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFolder?.name}"? 
              This will also delete all files and subfolders inside it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {errorMessage && (
              <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteFolderDialogOpen(false)} 
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={deleteFolder} 
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 