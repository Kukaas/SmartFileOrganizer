import { FileCard } from './FileCard';
import { motion } from 'framer-motion';

export function FileGrid({ files, onDelete, onRename, onAnalyze, onSummarize, onDownload }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {files.map((file, index) => (
        <motion.div
          key={file.fileId || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="h-full"
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
      {files.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-gray-300 mb-4"
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
          <p className="text-lg font-medium mb-1">No files found</p>
          <p className="text-sm">Upload some files to get started!</p>
        </div>
      )}
    </div>
  );
} 