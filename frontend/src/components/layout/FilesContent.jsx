import { FolderIcon, MoveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileGrid } from '@/components/features/FileGrid';

export function FilesContent({
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
  isFileBeingMoved
}) {
  return (
    <div className="flex-1 h-full flex flex-col">
      {/* Current folder header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <FolderIcon className="h-4 w-4 mr-2 text-blue-500" />
          <span className="font-medium">{currentFolderName}</span>
        </div>
        
        {selectedFiles.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={onOpenMoveDialog}
          >
            <MoveIcon className="h-3 w-3" />
            Move {selectedFiles.length > 1 ? `${selectedFiles.length} files` : '1 file'}
          </Button>
        )}
      </div>
      
      {/* Files grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <FileGrid
          files={filteredFiles}
          selectedFiles={selectedFiles}
          onToggleSelect={onToggleFileSelection}
          onDelete={onDelete}
          onRename={onRename}
          onAnalyze={onAnalyze}
          onSummarize={onSummarize}
          onDownload={onDownload}
          isLoading={isLoading}
          isFileBeingMoved={isFileBeingMoved}
        />
      </div>
    </div>
  );
} 