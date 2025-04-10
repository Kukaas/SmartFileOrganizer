import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useFileHandlers() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFilesSelected = async (newFiles) => {
    setIsLoading(true);
    try {
      const filePromises = newFiles.map(async (file) => {
        const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Determine file type
        let fileType = file.type;
        
        // Handle common file types that might have incorrect MIME types
        if (fileExtension && (!fileType || fileType === 'application/octet-stream')) {
          const extensionTypeMappings = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain',
            'js': 'text/javascript',
            'py': 'text/x-python',
            'md': 'text/markdown',
            'env': 'text/plain',
            'json': 'application/json',
            'csv': 'text/csv',
            'xml': 'application/xml',
            'zip': 'application/zip',
            'rar': 'application/vnd.rar',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
          };
          
          if (extensionTypeMappings[fileExtension]) {
            fileType = extensionTypeMappings[fileExtension];
          }
        }
        
        // Generate appropriate tags
        const tags = [];
        
        // Add main type tag if available
        if (fileType && fileType.includes('/')) {
          const mainType = fileType.split('/')[0];
          tags.push(mainType);
        }
        
        // Add file extension
        if (fileExtension) {
          tags.push(fileExtension);
        }
        
        // Add category tags based on extension or type
        if (fileExtension === 'pdf' || fileType === 'application/pdf' || 
            fileExtension === 'docx' || fileExtension === 'doc' || 
            fileExtension === 'txt' || fileExtension === 'md') {
          tags.push('document');
        } else if (fileExtension === 'js' || fileExtension === 'py' || 
                  fileExtension === 'java' || fileExtension === 'c' || 
                  fileExtension === 'cpp' || fileExtension === 'cs' || 
                  fileExtension === 'html' || fileExtension === 'css' || 
                  fileExtension === 'php' || fileExtension === 'rb') {
          tags.push('code');
        } else if (fileExtension === 'zip' || fileExtension === 'rar' || 
                  fileExtension === 'tar' || fileExtension === 'gz' || 
                  fileExtension === '7z') {
          tags.push('archive');
        } else if (fileType && fileType.startsWith('image/')) {
          tags.push('image');
        } else if (fileType && fileType.startsWith('video/')) {
          tags.push('video');
        } else if (fileType && fileType.startsWith('audio/')) {
          tags.push('audio');
        }
        
        return {
          id: fileId, 
          fileId: fileId,
          name: file.name,
          type: fileType || 'application/octet-stream', // Default type if none detected
          size: file.size,
          dateAdded: new Date().toISOString(),
          tags: tags,
          status: 'pending_analysis',
          url: URL.createObjectURL(file),
          _file: file, // Keep the original file object for content processing
        };
      });

      const processedFiles = await Promise.all(filePromises);

      // Update local storage and trigger sync
      chrome.storage.local.get(['files'], async function(result) {
        const existingFiles = result.files || [];
        const updatedFiles = [...existingFiles, ...processedFiles];
        await chrome.storage.local.set({ files: updatedFiles });
        
        // Sync with server
        try {
          const serverFiles = await api.syncFiles(processedFiles);
          setSyncError(null);
        } catch (error) {
          console.error('Error syncing with server:', error);
          
          // Set a more specific error message if it's a MongoDB duplicate key error
          if (error.message.includes('duplicate key error') || 
              (typeof error === 'object' && error.code === 11000)) {
            setSyncError('Device ID conflict detected. This may occur if you\'re using multiple browsers. Try clearing local storage or device fingerprint.');
          } else {
            setSyncError('Changes will be synced when connection is restored');
          }
        }
      });
      
      setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileToDelete) => {
    try {
      if (!fileToDelete.fileId) {
        console.error('Cannot delete file without fileId:', fileToDelete);
        setSyncError('Failed to delete file: Invalid file ID');
        toast.error('Failed to delete file: Invalid file ID');
        return;
      }

      // Delete from server first
      await api.deleteFile(fileToDelete);
      
      // Update state immediately
      setFiles(currentFiles => currentFiles.filter(file => file.fileId !== fileToDelete.fileId));
      
      // Then update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).filter(file => file.fileId !== fileToDelete.fileId);
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      setSyncError(null);
      toast.success(`File "${fileToDelete.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting file:', error);
      setSyncError('Failed to delete file from server');
      toast.error('Failed to delete file from server');
    }
  };

  const handleRename = async (file, newName) => {
    try {
      if (!file.fileId) {
        console.error('Cannot rename file without fileId:', file);
        setSyncError('Failed to rename file: Invalid file ID');
        toast.error('Failed to rename file: Invalid file ID');
        return;
      }

      // Update on server first
      const updatedFile = await api.updateFile(file, { name: newName });
      
      // Update state immediately
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { ...f, name: newName } : f)
      );
      
      // Then update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { ...f, name: newName } : f
        );
        chrome.storage.local.set({ files: updatedFiles }, () => {
          // Clear any error state after successful update
          setSyncError(null);
        });
      });
      
      toast.success(`File renamed to "${newName}"`);
    } catch (error) {
      console.error('Error renaming file:', error);
      setSyncError('Failed to update file on server');
      toast.error('Failed to update file on server');
      
      // Revert the state if server update failed
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { ...f, name: file.name } : f)
      );
    }
  };
  
  const handleAnalyze = async (file) => {
    try {
      setSyncError(null);
      
      // Call the AI service to analyze the file
      const analysisResult = await api.analyzeFile(file);
      
      // Update local state with analysis status
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'analyzed',
          lastAnalyzed: new Date().toISOString(),
          analysis: analysisResult
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'analyzed',
            lastAnalyzed: new Date().toISOString(),
            analysis: analysisResult
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      toast.success(`Analysis complete for "${file.name}"`);
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing file:', error);
      
      // Update file status to error in local state
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'error',
          error: error.message || 'Unknown error during analysis'
        } : f)
      );
      
      // Update local storage with error status
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'error',
            error: error.message || 'Unknown error during analysis'
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      // Create a more detailed error message based on the error
      let errorMessage = 'Failed to analyze file';
      
      if (error.message) {
        if (error.message.includes('API call failed')) {
          errorMessage = 'Server connection error during analysis';
        } else if (error.message.includes('File content not available')) {
          errorMessage = 'File content is missing or corrupted';
        } else if (error.message.includes('Hugging Face API key is missing') || 
                  error.message.includes('Gemini API key is missing')) {
          errorMessage = 'AI service configuration error';
        } else if (error.message.includes('Unsupported file type')) {
          // Provide more specific guidance about supported file types
          const fileExt = file.name.split('.').pop().toLowerCase();
          if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
            errorMessage = `Document analysis error: Unable to extract text from this ${fileExt.toUpperCase()} file. The file may be password-protected, corrupted, or contain only scanned images.`;
          } else {
            errorMessage = `This file type (${fileExt}) is not supported for analysis. Supported document types include TXT, PDF, DOC, and DOCX files.`;
          }
        } else {
          errorMessage = `Analysis failed: ${error.message}`;
        }
      }
      
      setSyncError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };
  
  const handleSummarize = async (file) => {
    try {
      setSyncError(null);
      
      // Call the AI service to summarize the file
      const summaryResult = await api.summarizeFile(file);
      
      // Update local state with summary status
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'analyzed',
          lastSummarized: new Date().toISOString(),
          summary: summaryResult.summary
        } : f)
      );
      
      // Update local storage
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'analyzed',
            lastSummarized: new Date().toISOString(),
            summary: summaryResult.summary
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      toast.success(`Summary complete for "${file.name}"`);
      return summaryResult;
    } catch (error) {
      console.error('Error summarizing file:', error);
      
      // Update file status to error in local state
      setFiles(currentFiles => 
        currentFiles.map(f => f.fileId === file.fileId ? { 
          ...f, 
          status: 'error',
          error: error.message || 'Unknown error during summarization'
        } : f)
      );
      
      // Update local storage with error status
      chrome.storage.local.get(['files'], function(result) {
        const updatedFiles = (result.files || []).map(f => 
          f.fileId === file.fileId ? { 
            ...f, 
            status: 'error',
            error: error.message || 'Unknown error during summarization'
          } : f
        );
        chrome.storage.local.set({ files: updatedFiles });
      });
      
      // Create a more detailed error message based on the error
      let errorMessage = 'Failed to summarize file';
      
      if (error.message) {
        if (error.message.includes('API call failed')) {
          errorMessage = 'Server connection error during summarization';
        } else if (error.message.includes('File content not available')) {
          errorMessage = 'File content is missing or corrupted';
        } else if (error.message.includes('Gemini API key is missing')) {
          errorMessage = 'AI service configuration error';
        } else if (error.message.includes('Unsupported file type')) {
          // Provide more specific guidance about supported file types
          const fileExt = file.name.split('.').pop().toLowerCase();
          if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
            errorMessage = `Document summarization error: Unable to extract text from this ${fileExt.toUpperCase()} file. The file may be password-protected, corrupted, or contain only scanned images.`;
          } else {
            errorMessage = `This file type (${fileExt}) is not supported for summarization. Supported document types include TXT, PDF, DOC, and DOCX files.`;
          }
        } else {
          errorMessage = `Summarization failed: ${error.message}`;
        }
      }
      
      setSyncError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleDownload = async (file) => {
    try {
      // Download the file from server
      const { blob, fileName } = await api.downloadFile(file);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || file.name;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setSyncError(null);
      toast.success(`Downloaded "${file.name}" successfully`);
      return { success: true };
    } catch (error) {
      console.error('Error downloading file:', error);
      setSyncError('Failed to download file from server');
      toast.error('Failed to download file from server');
      throw error;
    }
  };

  const handleToggleFileSelection = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.fileId === file.fileId);
      
      if (isSelected) {
        return prev.filter(f => f.fileId !== file.fileId);
      } else {
        return [...prev, file];
      }
    });
  };

  return {
    files,
    setFiles,
    selectedFiles,
    setSelectedFiles,
    isLoading,
    setIsLoading,
    syncError,
    setSyncError,
    handleFilesSelected,
    handleDelete,
    handleRename,
    handleAnalyze,
    handleSummarize,
    handleDownload,
    handleToggleFileSelection
  };
} 