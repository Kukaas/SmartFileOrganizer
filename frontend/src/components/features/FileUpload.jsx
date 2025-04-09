import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FileUpload({ onFilesSelected }) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    onFilesSelected?.(acceptedFiles);
  }, [onFilesSelected]);

  const handleFileSelect = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedFiles = Array.from(event.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
    onFilesSelected?.(selectedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    noClick: true, // Disable click handling from react-dropzone
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
        className={`p-8 border-2 border-dashed transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
      >
        <input 
          {...getInputProps()} 
          ref={fileInputRef}
          onChange={handleFileSelect}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex flex-col items-center justify-center gap-4">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={handleButtonClick}
            >
              Select Files
            </Button>
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFile(file);
                }}
                className="p-1 hover:bg-muted-foreground/10 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 