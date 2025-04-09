import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { File, Image, FileText, MoreVertical, FileArchive, Video, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FileCard({ file, onDelete, onRename }) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuTriggerRef = useRef(null);
  const inputRef = useRef(null);

  const handleRename = () => {
    if (newFileName.trim() && newFileName !== file.name) {
      onRename?.(file, newFileName.trim());
    }
    setIsRenameDialogOpen(false);
  };

  const openRenameDialog = () => {
    setNewFileName(file.name);
    setIsRenameDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening dialog
  };

  const handleDelete = useCallback(() => {
    setIsDropdownOpen(false); // Close dropdown before delete
    onDelete?.(file);
  }, [file, onDelete]);

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    if (type.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (type.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
    if (type.includes('zip') || type.includes('archive') || type.includes('compressed')) 
      return <FileArchive className="h-8 w-8 text-amber-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format file date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Truncate filename if it's too long
  const truncateFilename = (name, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    
    const extension = name.includes('.') ? name.split('.').pop() : '';
    const nameWithoutExt = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
    
    if (nameWithoutExt.length <= maxLength) return name;
    
    return `${nameWithoutExt.substring(0, maxLength)}...${extension ? `.${extension}` : ''}`;
  };

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="p-2 bg-white rounded-md shadow-sm flex items-center justify-center shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="space-y-1 overflow-hidden min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-medium leading-tight truncate" title={file.name}>
                      {truncateFilename(file.name)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{file.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                {file.dateAdded && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{formatDate(file.dateAdded)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  ref={menuTriggerRef}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="File options"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent 
                  align="end" 
                  side="right"
                  sideOffset={5}
                  className="z-50"
                >
                  <DropdownMenuItem onSelect={openRenameDialog} className="gap-2">
                    <span className="text-sm">Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={handleDelete}
                    className="text-red-500 gap-2"
                  >
                    <span className="text-sm">Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        </div>

        {file.tags && file.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {file.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Dialog 
        open={isRenameDialogOpen} 
        onOpenChange={setIsRenameDialogOpen}
      >
        <DialogContent onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for "{truncateFilename(file.name, 30)}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={inputRef}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new file name"
              aria-label="New file name"
              className="focus-visible:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleRename}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 