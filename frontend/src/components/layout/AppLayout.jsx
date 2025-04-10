import { MoveFileDialog } from '@/components/features/MoveFileDialog';
import { AppHeader } from '@/components/layout/AppHeader';
import { FolderSidebar } from '@/components/layout/FolderSidebar';
import { FilesContent } from '@/components/layout/FilesContent';
import { DeviceIDConflictBanner } from '@/components/layout/DeviceIDConflictBanner';

export function AppLayout({
  syncError,
  onFilesSelected,
  onSearch,
  onFilterChange,
  folders,
  currentFolderId,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  currentFolderName,
  filteredFiles,
  selectedFiles,
  onToggleFileSelection,
  onDelete,
  onRename,
  onAnalyze,
  onSummarize,
  onDownload,
  isLoading,
  onOpenMoveDialog,
  isMoveDialogOpen,
  onCloseMoveDialog,
  onMoveFiles,
  onFixDeviceIDConflict,
  isMovingFiles,
  isFileBeingMoved
}) {
  const isDeviceIdConflict = syncError === 'Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing local storage or device fingerprint.';

  return (
    <div className="relative h-[600px] w-[800px]">
      <AppHeader 
        syncError={syncError} 
        onFilesSelected={onFilesSelected} 
        onSearch={onSearch} 
        onFilterChange={onFilterChange} 
      />

      <div className="absolute top-[220px] bottom-0 left-0 right-0 overflow-hidden">
        <div className="flex h-full">
          <FolderSidebar 
            folders={folders}
            currentFolderId={currentFolderId}
            onFolderSelect={onFolderSelect}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
          
          <FilesContent 
            currentFolderName={currentFolderName}
            filteredFiles={filteredFiles}
            selectedFiles={selectedFiles}
            onToggleFileSelection={onToggleFileSelection}
            onDelete={onDelete}
            onRename={onRename}
            onAnalyze={onAnalyze}
            onSummarize={onSummarize}
            onDownload={onDownload}
            isLoading={isLoading}
            onOpenMoveDialog={onOpenMoveDialog}
            isFileBeingMoved={isFileBeingMoved}
          />
        </div>
      </div>
      
      <MoveFileDialog
        isOpen={isMoveDialogOpen}
        onClose={onCloseMoveDialog}
        folders={folders}
        selectedFiles={selectedFiles}
        onMoveFiles={onMoveFiles}
        isMoving={isMovingFiles}
      />

      {isDeviceIdConflict && (
        <DeviceIDConflictBanner onFixConflict={onFixDeviceIDConflict} />
      )}
    </div>
  );
} 