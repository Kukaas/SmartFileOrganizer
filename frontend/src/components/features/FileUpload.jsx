import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FileUpload({ onFilesSelected }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return false;
    }
    return true;
  };

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    if (acceptedFiles && acceptedFiles.length > 0) {
      // Check file sizes
      const oversizedFiles = acceptedFiles.filter(file => !validateFileSize(file));
      if (oversizedFiles.length > 0) {
        setError(`File${oversizedFiles.length > 1 ? 's' : ''} exceeding 4MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        // Filter out oversized files
        const validFiles = acceptedFiles.filter(file => validateFileSize(file));
        
        if (validFiles.length === 0) return;
        
        // Store the valid files
        const filesWithMetadata = validFiles.map(file => ({
          _file: file,
          preview: URL.createObjectURL(file)
        }));
        
        setFiles(prev => [...prev, ...filesWithMetadata]);
        onFilesSelected?.(validFiles);
      } else {
        // All files are valid
        const filesWithMetadata = acceptedFiles.map(file => ({
          _file: file,
          preview: URL.createObjectURL(file)
        }));
        
        setFiles(prev => [...prev, ...filesWithMetadata]);
        onFilesSelected?.(acceptedFiles);
      }
    }
  }, [onFilesSelected]);

  const handleFileSelect = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      // Check file sizes
      const oversizedFiles = selectedFiles.filter(file => !validateFileSize(file));
      if (oversizedFiles.length > 0) {
        setError(`File${oversizedFiles.length > 1 ? 's' : ''} exceeding 4MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        // Filter out oversized files
        const validFiles = selectedFiles.filter(file => validateFileSize(file));
        
        if (validFiles.length === 0) return;
        
        // Store the valid files
        const filesWithMetadata = validFiles.map(file => ({
          _file: file,
          preview: URL.createObjectURL(file)
        }));
        
        setFiles(prev => [...prev, ...filesWithMetadata]);
        onFilesSelected?.(validFiles);
      } else {
        // All files are valid
        const filesWithMetadata = selectedFiles.map(file => ({
          _file: file,
          preview: URL.createObjectURL(file)
        }));
        
        setFiles(prev => [...prev, ...filesWithMetadata]);
        onFilesSelected?.(selectedFiles);
      }
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
          ${isDragActive ? 'border-primary bg-primary/5' : error ? 'border-destructive bg-destructive/5' : 'border-muted-foreground/25'}`}
      >
        <input 
          {...getInputProps()} 
          ref={fileInputRef}
          onChange={handleFileSelect}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${error ? 'bg-destructive/5' : 'bg-primary/5'}`}>
              {error ? (
                <AlertCircle className="h-6 w-6 text-destructive" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {isDragActive ? 'Drop files here' : 'Drop files here'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports all file types up to 4MB
              </p>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mt-2 text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

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