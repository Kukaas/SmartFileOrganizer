import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  File, 
  Image, 
  FileText, 
  MoreVertical, 
  FileArchive, 
  Video, 
  Music,
  BookOpen,
  Brain,
  FileSearch,
  Sparkles,
  Download,
  FileOutput,
  Trash2,
  Pencil
} from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportToPDF, exportToDOCX } from '@/utils/documentExporter';
import { ExportPreviewDialog } from './ExportPreviewDialog';

// Component to cleanly display content without markdown conversion
function ContentDisplay({ content, color = "purple" }) {
  // First clean up any special characters or placeholders
  const cleanContent = content.replace(/\$\d+/g, '').trim();
  
  // Split the text by lines, filtering out empty lines and lines with just "$2"
  const lines = cleanContent.split('\n')
    .filter(line => line.trim() && !line.trim().match(/^\$\d+$/))
    .map(line => line.replace(/^\$\d+\s*/, ''));  // Remove $2 at the beginning of lines
  
  if (lines.length === 0) {
    return <p>No content available.</p>;
  }

  // Colors based on the type (purple for summary, blue for analysis)
  const colors = {
    purple: {
      h1: "text-purple-700",
      h2: "text-purple-600",
      h3: "text-purple-500"
    },
    blue: {
      h1: "text-blue-700",
      h2: "text-blue-600",
      h3: "text-blue-500"
    }
  };

  const colorTheme = colors[color] || colors.purple;

  // Enhanced detection of standalone bullet points (common in AI outputs)
  const isStandaloneBullet = (line) => {
    return line.trim() === '•' || line.trim() === '*' || line.trim() === '-';
  };

  // Look for main sections and make them visually distinct
  return (
    <div className="space-y-2 pt-2">
      {lines.map((line, index) => {
        // Check if it's a title/heading
        if (line.trim().match(/^#\s+/)) {
          return (
            <h2 key={index} className={`text-lg font-bold ${colorTheme.h1} mb-1 mt-2`}>
              {line.replace(/^#\s+/, '')}
            </h2>
          );
        }
        
        // Check if it's a subheading
        if (line.trim().match(/^##\s+/)) {
          return (
            <h3 key={index} className={`text-base font-bold ${colorTheme.h2} mb-1 mt-2`}>
              {line.replace(/^##\s+/, '')}
            </h3>
          );
        }
        
        // Handle standalone bullet followed by content on next line
        if (isStandaloneBullet(line) && index < lines.length - 1) {
          // Skip this line and let the next line handle it with the bullet
          return null;
        }
        
        // Check if this is a bullet point (handles multiple bullet formats)
        // Also handle the case where the bullet is on a line by itself
        if (line.trim().match(/^[*•-]\s+/) || 
            line.trim().match(/^\u2022\s+/) || 
            (index > 0 && isStandaloneBullet(lines[index-1]))) {
          
          let content = line;
          // If previous line was a standalone bullet, use the current line as content
          if (index > 0 && isStandaloneBullet(lines[index-1])) {
            content = line;
          } else {
            // Otherwise strip the bullet from the current line
            content = line.replace(/^[*•-]\s+/, '').replace(/^\u2022\s+/, '');
          }
          
          return (
            <div key={index} className="flex space-x-2 ml-3 text-sm">
              <span className="text-gray-700 mt-0.5">•</span>
              <div className="text-gray-700 flex-1">
                {/* If content has bold markers, handle them */}
                {content.includes('**') ? (
                  <p dangerouslySetInnerHTML={{ 
                    __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ) : (
                  <p>{content}</p>
                )}
              </div>
            </div>
          );
        }
        
        // Check if it contains bold text (**text**)
        if (line.includes('**')) {
          // Replace **text** with <strong>text</strong>
          const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return (
            <p key={index} className="text-sm leading-snug" 
               dangerouslySetInnerHTML={{ __html: formattedLine }}>
            </p>
          );
        }
        
        // Default paragraph
        return (
          <p key={index} className="text-sm leading-snug">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function FileCard({ file, onDelete, onRename, onAnalyze, onSummarize, onDownload }) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [analysisDialog, setAnalysisDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [summary, setSummary] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportData, setExportData] = useState({ content: "", title: "", filename: "" });
  
  const menuTriggerRef = useRef(null);
  const inputRef = useRef(null);

  // Get file extension
  const fileExtension = file.name.split('.').pop().toLowerCase();

  // Check if file is a text-based, readable document that can be analyzed/summarized
  const isAnalyzableDocument = (
    // Document files
    file.type === 'application/pdf' ||
    file.type.includes('document') ||
    fileExtension === 'pdf' ||
    fileExtension === 'doc' ||
    fileExtension === 'docx' ||
    
    // Text files
    file.type.includes('text') ||
    fileExtension === 'txt' ||
    fileExtension === 'md' ||
    fileExtension === 'rtf' ||
    
    // Code files (can also be analyzed)
    fileExtension === 'js' ||
    fileExtension === 'py' ||
    fileExtension === 'html' ||
    fileExtension === 'css' ||
    fileExtension === 'json' ||
    fileExtension === 'xml' ||
    fileExtension === 'java' ||
    fileExtension === 'c' ||
    fileExtension === 'cpp' ||
    fileExtension === 'cs'
  );

  // Check for non-analyzable file types
  const isNonAnalyzableFile = (
    // Images
    file.type.startsWith('image/') ||
    
    // Videos and audio
    file.type.startsWith('video/') ||
    file.type.startsWith('audio/') ||
    
    // Archives
    file.type.includes('zip') ||
    file.type.includes('archive') ||
    file.type.includes('compressed') ||
    ['zip', 'rar', 'tar', 'gz', '7z'].includes(fileExtension) ||
    
    // Binaries and executables
    ['exe', 'dll', 'bin', 'so', 'apk', 'app'].includes(fileExtension)
  );

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
  
  const handleDownload = useCallback(() => {
    setIsDropdownOpen(false);
    setIsDownloading(true);
    
    onDownload?.(file)
      .finally(() => {
        setIsDownloading(false);
      });
  }, [file, onDownload]);
  
  const handleAnalyze = useCallback(() => {
    setIsDropdownOpen(false);
    setIsAnalyzing(true);
    setAnalysisDialog(true);
    setAnalysis("");

    // Call the API to analyze the file
    onAnalyze?.(file)
      .then(result => {   
        // Format the results for display
        let formattedAnalysis = '';

        // Format Hugging Face results
        if (result.huggingface && !result.huggingface.error) {
          formattedAnalysis += `# Hugging Face Analysis\n\n`;
          
          if (result.huggingface.analysisType === 'image-classification') {
            formattedAnalysis += `## Image Classification\n\n`;
            const classifications = result.huggingface.results || [];
            classifications.forEach((item, i) => {
              formattedAnalysis += `- ${item.label}: ${(item.score * 100).toFixed(2)}%\n`;
            });
          } else {
            formattedAnalysis += `## Text Analysis\n\n`;
            const classifications = Array.isArray(result.huggingface.results) 
              ? result.huggingface.results 
              : [result.huggingface.results];
              
            classifications.forEach((item, i) => {
              if (item.label) {
                formattedAnalysis += `- ${item.label}: ${(item.score * 100).toFixed(2)}%\n`;
              }
            });
          }
          
          formattedAnalysis += `\n`;
        }

        // Format Gemini results - updated for gemini-2.0-flash format
        if (result.gemini && !result.gemini.error) {
          formattedAnalysis += `# Gemini Analysis\n\n`;
          
          try {
            // The new model response format might be different
            const geminiResults = result.gemini.results;
            
            if (geminiResults.candidates && geminiResults.candidates.length > 0) {
              // Try to extract text from the response based on the new format
              const candidate = geminiResults.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                // Extract text from the first text part
                const textParts = candidate.content.parts.filter(part => part.text);
                if (textParts.length > 0) {
                  formattedAnalysis += textParts[0].text;
                } else {
                  formattedAnalysis += 'No text content found in response.';
                }
              } else {
                formattedAnalysis += 'Unexpected response format.';
              }
            } else if (geminiResults.text) {
              // Handle alternative response format
              formattedAnalysis += geminiResults.text;
            } else {
              // Fallback: stringify the result
              formattedAnalysis += `Raw response: ${JSON.stringify(geminiResults, null, 2)}`;
            }
          } catch (error) {
            formattedAnalysis += `Error parsing Gemini results: ${error.message}\n`;
            formattedAnalysis += `Raw response: ${JSON.stringify(result.gemini.results, null, 2)}\n`;
          }
        }

        // Handle errors
        if ((result.huggingface && result.huggingface.error) || (result.gemini && result.gemini.error)) {
          formattedAnalysis += `\n\n## Analysis Errors\n\n`;
          
          if (result.huggingface && result.huggingface.error) {
            const huggingFaceError = result.huggingface.error;
            
            // Check for the specific "candidate_labels" error
            if (huggingFaceError.includes('Error in `parameters.candidate_labels`')) {
              formattedAnalysis += `- Hugging Face: This file type is not supported for text classification. Try a text document instead.\n`;
            } else {
              formattedAnalysis += `- Hugging Face: ${huggingFaceError}\n`;
            }
          }
          
          if (result.gemini && result.gemini.error) {
            formattedAnalysis += `- Gemini: ${result.gemini.error}\n`;
          }
        }
        
        // Perform aggressive cleaning of the analysis
        // First remove standalone $2 or similar placeholders on their own lines
        formattedAnalysis = formattedAnalysis.replace(/^\$\d+\s*$/gm, '');
        
        // Remove any $2 or similar placeholders that appear at the beginning of lines
        formattedAnalysis = formattedAnalysis.replace(/^\$\d+\s*/gm, '');
        
        // Remove any isolated $2 or similar placeholders
        formattedAnalysis = formattedAnalysis.replace(/\$\d+/g, '');
        
        // Remove repeated empty lines and trim
        formattedAnalysis = formattedAnalysis.replace(/\n{3,}/g, '\n\n').trim();

        setAnalysis(formattedAnalysis);
        setIsAnalyzing(false);
      })
      .catch(error => {
        console.error('Error analyzing file:', error);
        
        // More user-friendly error message
        let errorMessage = 'Failed to analyze file';
        
        if (error.message && error.message.includes('Error in `parameters.candidate_labels`')) {
          errorMessage = 'Analysis Error: The document format needs special processing. We\'ve updated our system to better handle this file type. Please try analyzing again.';
        } else if (error.message && error.message.includes('Hugging Face API error')) {
          errorMessage = 'Analysis Error: There was an issue with the AI service. The document will be processed with our backup AI system instead.';
        } else if (error.message && error.message.includes('Unsupported file type')) {
          const fileExt = file.name.split('.').pop().toLowerCase();
          errorMessage = `Analysis Error: This file type (${fileExt}) is not fully supported. We recommend using PDF, DOCX, or TXT files for best results.`;
        } else if (error.message && error.message.includes('Unable to extract text')) {
          errorMessage = 'Analysis Error: We couldn\'t extract text from this document. It may be password-protected, scanned images, or in a format we can\'t process.';
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        setAnalysis(`# Analysis Error\n\n${errorMessage}`);
        setIsAnalyzing(false);
      });
  }, [file, onAnalyze]);
  
  const handleSummarize = useCallback(() => {
    setIsDropdownOpen(false);
    setIsSummarizing(true);
    setSummaryDialog(true);
    setSummary("");

    // Call the API to get file summary
    onSummarize?.(file)
      .then(result => {
        let summaryText = "";
        
        // Direct summary from the API response
        if (result.summary) {
          summaryText = result.summary;
        } 
        // Try to extract from Gemini result if direct summary not available
        else if (result.gemini && !result.gemini.error) {
          try {
            // Handle Gemini model response format
            const geminiResults = result.gemini.results;
            
            if (geminiResults.candidates && geminiResults.candidates.length > 0) {
              // Extract text from the first candidate
              const candidate = geminiResults.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                // Get text from the first text part
                const textParts = candidate.content.parts.filter(part => part.text);
                if (textParts.length > 0) {
                  summaryText = textParts[0].text;
                } else {
                  summaryText = 'No text content found in summary response.';
                }
              } else {
                summaryText = 'Unexpected summary response format.';
              }
            } else if (geminiResults.text) {
              // Alternative format
              summaryText = geminiResults.text;
            } else {
              // Fallback
              summaryText = `Raw response: ${JSON.stringify(geminiResults, null, 2)}`;
            }
          } catch (error) {
            summaryText = `Error extracting summary: ${error.message}\nRaw response: ${JSON.stringify(result.gemini?.results, null, 2) || 'No result data'}`;
          }
        } else if (result.gemini && result.gemini.error) {
          summaryText = `Error: ${result.gemini.error}`;
        } else {
          summaryText = 'No summary available. Please try again later.';
        }
        
        // Clean up the summary before setting it to state
        summaryText = summaryText.replace(/^\$\d+$/gm, '').trim();
        
        // Remove any repeated empty lines
        summaryText = summaryText.replace(/\n{3,}/g, '\n\n');
        
        setSummary(summaryText);
        setIsSummarizing(false);
      })
      .catch(error => {
        console.error('Error summarizing file:', error);
        setSummary(`# Summarization Error\n\nFailed to summarize file: ${error.message}`);
      setIsSummarizing(false);
      });
  }, [file, onSummarize]);

  // Handler for exporting analysis or summary
  const handleExportClick = (type) => {
    if (type === 'analysis') {
      setExportData({
        content: analysis,
        title: `AI Analysis: ${file.name}`,
        filename: `${file.name.split('.')[0]}-analysis`
      });
    } else {
      setExportData({
        content: summary,
        title: `AI Summary: ${file.name}`,
        filename: `${file.name.split('.')[0]}-summary`
      });
    }
    setIsExportDialogOpen(true);
  };

  const getFileIcon = (type) => {
    // Extract file extension from name
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Check type and extension to determine the appropriate icon
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    if (type.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (type.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
    if (type.includes('zip') || type.includes('archive') || type.includes('compressed') || 
        ['zip', 'rar', 'tar', 'gz', '7z'].includes(fileExtension)) 
      return <FileArchive className="h-8 w-8 text-amber-500" />;
        
    // Code file icons
    if (['js', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'html', 'css', 'ts', 'jsx', 'tsx'].includes(fileExtension)) {
      return <File className="h-8 w-8 text-emerald-500" />;
    }
    
    // Document icons
    if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(fileExtension)) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    
    // Default icon for all other files
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
      <Card className="p-3 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 border-gray-200">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className="p-1.5 bg-white rounded-md shadow-sm flex items-center justify-center shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="space-y-0.5 overflow-hidden min-w-0">
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
                    <Pencil className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Rename</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={handleDownload}
                    className="gap-2 text-green-600"
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </span>
                  </DropdownMenuItem>
                  
                  {isAnalyzableDocument && !isNonAnalyzableFile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-gray-500">AI Tools</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onSelect={handleAnalyze}
                        className="gap-2 text-blue-600"
                      >
                        <FileSearch className="h-4 w-4" />
                        <span className="text-sm">Analyze with AI</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={handleSummarize}
                        className="gap-2 text-purple-600"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm">Summarize with AI</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem 
                    onSelect={handleDelete}
                    className="text-red-500 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        </div>

        {file.tags && file.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {file.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Rename Dialog */}
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
      
      {/* Summary Dialog */}
      <Dialog open={summaryDialog} onOpenChange={setSummaryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-1 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-bold">
                AI Summary: {truncateFilename(file.name, 30)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Concise AI-generated summary of your document
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white to-purple-50">
            {isSummarizing ? (
              <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg">
                <BookOpen className="h-10 w-10 text-purple-600 animate-pulse mb-3" />
                <p className="text-base font-medium text-gray-700 mb-2">AI is summarizing your document...</p>
                <div className="space-y-1 w-64">
                  <div className="h-2 bg-purple-200 rounded animate-pulse"></div>
                  <div className="h-2 bg-purple-300 rounded animate-pulse"></div>
                  <div className="h-2 bg-purple-200 rounded animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-500 mt-3">Creating a concise overview of key points</p>
              </div>
            ) : (
              <div className="px-2 text-sm max-w-none rounded-lg text-gray-700">
                {summary ? (
                  <ContentDisplay content={summary} />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-gray-500">No summary results available</div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 flex-shrink-0 border-t mt-auto">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setSummaryDialog(false)}
            >
              Close
            </Button>
            {!isSummarizing && summary && (
              <Button 
                type="button"
                className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
                onClick={() => handleExportClick('summary')}
              >
                <FileOutput className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Analysis Dialog */}
      <Dialog open={analysisDialog} onOpenChange={setAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-1 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold">
                AI Analysis: {truncateFilename(file.name, 30)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detailed AI-powered analysis of your document
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white to-blue-50">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg">
                <Brain className="h-10 w-10 text-blue-600 animate-pulse mb-3" />
                <p className="text-base font-medium text-gray-700 mb-2">AI is analyzing your document...</p>
                <div className="space-y-1 w-64">
                  <div className="h-2 bg-blue-200 rounded animate-pulse"></div>
                  <div className="h-2 bg-blue-300 rounded animate-pulse"></div>
                  <div className="h-2 bg-blue-200 rounded animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-500 mt-3">Identifying key topics, entities, and insights</p>
              </div>
            ) : (
              <div className="px-2 text-sm max-w-none rounded-lg text-gray-700">
                {analysis ? (
                  <ContentDisplay content={analysis} color="blue" />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-gray-500">No analysis results available</div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 flex-shrink-0 border-t mt-auto">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setAnalysisDialog(false)}
            >
              Close
            </Button>
            {!isAnalyzing && analysis && (
              <Button 
                type="button"
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                onClick={() => handleExportClick('analysis')}
              >
                <FileOutput className="h-4 w-4 mr-2" />
                Export Analysis
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Export Preview Dialog */}
      <ExportPreviewDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        content={exportData.content}
        title={exportData.title}
        filename={exportData.filename}
      />
    </>
  );
}

// Add markdown to HTML conversion
function markdownToHtml(markdown) {
  // Basic markdown to HTML conversion
  if (!markdown) return '';
  
  return markdown
    // Clean up any $ characters that might be appearing as placeholders
    .replace(/^\$\d+$/gm, '')
    
    // Headers
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold text-blue-700 mb-1 mt-2">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold text-blue-600 mb-1 mt-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold text-blue-500 mb-0.5 mt-1">$1</h3>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Lists - reduce spacing and indentation
    .replace(/^\*\s(.*)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^-\s(.*)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^\d+\.\s(.*)$/gm, '<li class="ml-3 list-decimal">$1</li>')
    
    // Replace consecutive list items with a <ul> or <ol> wrapper
    .replace(/(<li class="ml-3 list-disc">.*<\/li>)\n(?=<li class="ml-3 list-disc">)/g, '$1')
    .replace(/(<li class="ml-3 list-decimal">.*<\/li>)\n(?=<li class="ml-3 list-decimal">)/g, '$1')
    
    // Add appropriate list tags with reduced margins
    .replace(/(?:^<li class="ml-3 list-disc">)/m, '<ul class="my-1 space-y-0">$&')
    .replace(/(?<=<\/li>)(?!\n<li class="ml-3 list-disc">)/g, '</ul>')
    .replace(/(?:^<li class="ml-3 list-decimal">)/m, '<ol class="my-1 space-y-0">$&')
    .replace(/(?<=<\/li>)(?!\n<li class="ml-3 list-decimal">)/g, '</ol>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-1 rounded-md overflow-x-auto my-1 text-xs"><code>$1</code></pre>')
    
    // Blockquotes
    .replace(/^>\s(.*)$/gm, '<blockquote class="border-l-2 border-gray-300 pl-2 py-0.5 italic text-gray-600 text-sm">$1</blockquote>')
    
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener">$1</a>')
    
    // Paragraphs - reduce margins
    .replace(/^\s*(\n)?(.+)/gm, function(m) {
      // Skip if it's already an HTML tag or just whitespace
      if (/^<(\/)?(h1|h2|h3|h4|h5|h6|ul|ol|li|blockquote|pre|img)/.test(m) || /^\s*$/.test(m)) {
        return m;
      }
      return '<p class="my-1 text-gray-700 text-sm leading-snug">$2</p>';
    })
    
    // Remove empty paragraphs that might have been created
    .replace(/<p class="[^"]*">\s*<\/p>/g, '')
    
    // Line breaks - reduce multiple line breaks
    .replace(/\n\n+/g, '<br>')
    .replace(/\n/g, ' ')
    
    // Remove any empty lines
    .replace(/^\s*[\r\n]/gm, '')
    
    // Final cleanup of any multiple consecutive breaks
    .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>');
} 