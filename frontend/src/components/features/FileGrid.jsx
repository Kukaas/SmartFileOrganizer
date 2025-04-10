import { FileCard } from './FileCard';
import { Loader2, FileX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FileGrid({ 
  files, 
  selectedFiles = [],
  onToggleSelect,
  onDelete, 
  onRename, 
  onAnalyze, 
  onSummarize, 
  onDownload,
  isLoading = false,
  isFileBeingMoved
}) {
  // Helper function to check if a file is selected
  const isFileSelected = (file) => {
    return selectedFiles.some(f => f.fileId === file.fileId);
  };

  return (
    <div className="w-full h-full relative">
      <ScrollArea className="h-full w-full pr-2">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-10 w-10 text-muted-foreground mb-3 animate-spin" />
            <h3 className="text-lg font-medium text-foreground mb-2">Loading files</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we fetch your files.
            </p>
          </div>
        ) : files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <FileX className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">No files found</h3>
            <p className="text-sm text-muted-foreground">
              Upload some files to get started or change your search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 py-2">
            {files.map((file) => (
              <FileCard
                key={file.fileId}
                file={file}
                isSelected={isFileSelected(file)}
                onToggleSelect={onToggleSelect}
                onDelete={onDelete}
                onRename={onRename}
                onAnalyze={onAnalyze}
                onSummarize={onSummarize}
                onDownload={onDownload}
                isMoving={isFileBeingMoved ? isFileBeingMoved(file) : false}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 