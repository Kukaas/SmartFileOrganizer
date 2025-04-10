import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScrollbarStyles } from '@/components/ui/ScrollbarStyles';
import { useFileHandlers } from '@/lib/hooks/useFileHandlers';
import { useFolderHandlers } from '@/lib/hooks/useFolderHandlers';
import { useDeviceFingerprint } from '@/lib/hooks/useDeviceFingerprint';
import { useFilters } from '@/lib/hooks/useFilters';
import { useDataSync } from '@/lib/hooks/useDataSync';

function App() {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isMovingFiles, setIsMovingFiles] = useState(false);
  const [movingFileIds, setMovingFileIds] = useState([]);
  
  // Data sync with server
  const dataSync = useDataSync(currentFolderId);
  const { files, folders, isLoading, syncError, setSyncError, refreshFiles } = dataSync;
  
  // File operations
  const fileHandlers = useFileHandlers();
  const { 
    selectedFiles, setSelectedFiles,
    handleFilesSelected, handleDelete, handleRename, 
    handleAnalyze, handleSummarize, handleDownload, 
    handleToggleFileSelection 
  } = fileHandlers;
  
  // Folder operations
  const folderHandlers = useFolderHandlers();
  const { 
    handleCreateFolder, handleRenameFolder, handleDeleteFolder
  } = folderHandlers;
  
  // Search and filtering
  const filterHooks = useFilters();
  const { 
    searchQuery, setSearchQuery, 
    filterType, setFilterType,
    getFilteredFiles
  } = filterHooks;
  
  // Device fingerprint handling
  const deviceFingerprint = useDeviceFingerprint();
  const { handleFixDeviceIDConflict } = deviceFingerprint;

  // Update file handlers with current files
  useEffect(() => {
    if (files && files.length >= 0) {
      fileHandlers.setFiles(files);
    }
  }, [files]);
  
  // Update folder handlers with current folders
  useEffect(() => {
    if (folders && folders.length >= 0) {
      folderHandlers.setFolders(folders);
      folderHandlers.setCurrentFolderId(currentFolderId);
    }
  }, [folders, currentFolderId]);

  // Handle folder selection
  const handleFolderSelect = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedFiles([]); // Clear selections when changing folders
  };
  
  // Enhance delete folder to ensure files list is refreshed after deletion
  const handleEnhancedDeleteFolder = async (folderId) => {
    try {
      await handleDeleteFolder(folderId);
      // After folder is deleted, refresh files to update UI
      await refreshFiles();
      
      // If we were in the deleted folder, make sure to update the current folder too
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
    } catch (error) {
      console.error('Error in enhanced folder deletion:', error);
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
      setIsMovingFiles(true);
      setMovingFileIds(fileIds);
      
      // Move files on server
      await api.moveFilesToFolder(fileIds, targetFolderId);
      
      // Refresh file list after move
      await refreshFiles();
      
      // Get the target folder name
      const targetFolder = folders.find(f => f.folderId === targetFolderId);
      const targetName = targetFolder ? targetFolder.name : 'destination folder';
      
      // Show success message
      toast.success(`${fileIds.length} file(s) moved to ${targetFolderId ? `"${targetName}"` : 'Home'}`);
      
      // Clear selections after move
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error moving files:', error);
      setSyncError('Failed to move files');
      toast.error(`Failed to move files: ${error.message || 'Unknown error'}`);
    } finally {
      setIsMovingFiles(false);
      setMovingFileIds([]);
      setIsMoveDialogOpen(false);
    }
  };

  // Handle device ID conflict
  const handleFixConflict = async () => {
    const result = await handleFixDeviceIDConflict((updatedFiles) => {
      fileHandlers.setFiles(updatedFiles);
    });
  };

  // Get current folder name
  const currentFolderName = currentFolderId 
    ? folders.find(f => f.folderId === currentFolderId)?.name || 'Unknown Folder'
    : 'Home';

  // Filter files for the current view
  const filteredFiles = getFilteredFiles(files);

  // Determine if a specific file is being moved
  const isFileBeingMoved = (file) => {
    return isMovingFiles && movingFileIds.includes(file.fileId);
  };

  return (
    <>
      <ScrollbarStyles />
      <AppLayout
        syncError={syncError}
        onFilesSelected={handleFilesSelected}
        onSearch={setSearchQuery}
        onFilterChange={setFilterType}
        folders={folders}
        currentFolderId={currentFolderId}
        onFolderSelect={handleFolderSelect}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleEnhancedDeleteFolder}
        currentFolderName={currentFolderName}
        filteredFiles={filteredFiles}
        selectedFiles={selectedFiles}
        onToggleFileSelection={handleToggleFileSelection}
        onDelete={handleDelete}
        onRename={handleRename}
        onAnalyze={handleAnalyze}
        onSummarize={handleSummarize}
        onDownload={handleDownload}
        isLoading={isLoading}
        onOpenMoveDialog={handleOpenMoveDialog}
        isMoveDialogOpen={isMoveDialogOpen}
        onCloseMoveDialog={() => !isMovingFiles && setIsMoveDialogOpen(false)}
        onMoveFiles={handleMoveFiles}
        onFixDeviceIDConflict={handleFixConflict}
        isMovingFiles={isMovingFiles}
        isFileBeingMoved={isFileBeingMoved}
      />
    </>
  );
}

export default App;
