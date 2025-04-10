import { FoldersList } from '@/components/features/FoldersList';

export function FolderSidebar({
  folders,
  currentFolderId,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder
}) {
  return (
    <div className="w-[220px] h-full p-4 border-r border-border overflow-y-auto">
      <FoldersList 
        folders={folders}
        currentFolderId={currentFolderId}
        onFolderSelect={onFolderSelect}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      />
    </div>
  );
} 