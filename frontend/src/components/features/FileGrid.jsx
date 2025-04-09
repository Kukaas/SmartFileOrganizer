import { FileCard } from './FileCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function FileGrid({ files, onDelete, onRename, onAnalyze, onSummarize, onDownload, isLoading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {isLoading && files.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 bg-gray-100/50 rounded-lg border border-dashed border-gray-300">
          <Loader2 className="h-12 w-12 text-gray-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-1">Loading your files...</p>
          <p className="text-sm text-gray-600">Please wait while we fetch your data</p>
        </div>
      )}
      
      {!isLoading && files.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-gray-300 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-base font-medium mb-1">No files found</p>
          <p className="text-sm">Upload some files to get started!</p>
        </div>
      )}
      
      {files.map((file, index) => (
        <motion.div
          key={file.fileId || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="flex flex-col h-full"
        >
          <FileCard
            file={file}
            onDelete={onDelete}
            onRename={onRename}
            onAnalyze={onAnalyze}
            onSummarize={onSummarize}
            onDownload={onDownload}
          />
        </motion.div>
      ))}
    </div>
  );
} 