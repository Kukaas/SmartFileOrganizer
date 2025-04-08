import { FileCard } from './FileCard';

export function FileGrid({ files, onDelete, onRename }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file, index) => (
        <FileCard
          key={index}
          file={file}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
      {files.length === 0 && (
        <div className="col-span-full text-center py-8 text-muted-foreground">
          No files found. Upload some files to get started!
        </div>
      )}
    </div>
  );
} 