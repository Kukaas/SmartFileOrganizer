import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FileUpload({ onFilesSelected }) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      // Store the complete file objects
      const filesWithMetadata = acceptedFiles.map(file => ({
        _file: file, // Keep the original file object for content processing
        preview: URL.createObjectURL(file)
      }));
      
      setFiles(prev => [...prev, ...filesWithMetadata]);
      onFilesSelected?.(acceptedFiles);
    }
  }, [onFilesSelected]);

  const handleFileSelect = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      // Store the complete file objects
      const filesWithMetadata = selectedFiles.map(file => ({
        _file: file, // Keep the original file object for content processing
        preview: URL.createObjectURL(file)
      }));
      
      setFiles(prev => [...prev, ...filesWithMetadata]);
      onFilesSelected?.(selectedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Disable click handling from react-dropzone
    useFsAccessApi: false, // Use the legacy API for better compatibility
    preventDropOnDocument: false, // Allow dropping anywhere in the document
  });

  const removeFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  const handleButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <Card
        {...getRootProps()}
        className={`p-4 border-2 border-dashed transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
      >
        <input 
          {...getInputProps()} 
          ref={fileInputRef}
          onChange={handleFileSelect}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/5 rounded-md">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {isDragActive ? 'Drop files here' : 'Drop files here'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports all file types
              </p>
            </div>
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 py-1 px-2 bg-muted rounded-full text-xs"
            >
              <File className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{file._file?.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFile(file);
                }}
                className="p-0.5 hover:bg-muted-foreground/10 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 