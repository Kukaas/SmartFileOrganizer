import { FileCard } from './FileCard';
import { motion } from 'framer-motion';
import { Loader2, FileX } from 'lucide-react';

export function FileGrid({ files, onDelete, onRename, onAnalyze, onSummarize, onDownload, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-full flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
          <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
          <p className="text-lg font-medium text-foreground mb-1">Loading your files...</p>
          <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-full flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
          <FileX 
            className="h-10 w-10 text-muted-foreground mb-3"
          />
          <p className="text-lg font-medium text-foreground mb-1">No files found</p>
          <p className="text-sm text-muted-foreground">Upload some files to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {files.map((file) => (
        <div key={file.id} className="col-span-12 sm:col-span-6 md:col-span-4">
          <FileCard 
            file={file} 
            onDelete={onDelete}
            onRename={onRename}
            onAnalyze={onAnalyze}
            onSummarize={onSummarize}
            onDownload={onDownload}
          />
        </div>
      ))}
    </div>
  );
} 