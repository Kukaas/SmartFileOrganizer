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
  Download
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
  
  const menuTriggerRef = useRef(null);
  const inputRef = useRef(null);

  // Check if file is a document or PDF
  const isDocument = file.type === 'application/pdf' || 
                    file.type.includes('document') || 
                    file.name.toLowerCase().endsWith('.pdf') ||
                    file.type.includes('text') ||
                    file.name.toLowerCase().endsWith('.txt') ||
                    file.name.toLowerCase().endsWith('.doc') ||
                    file.name.toLowerCase().endsWith('.docx');

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
            formattedAnalysis += `- Hugging Face: ${result.huggingface.error}\n`;
          }
          
          if (result.gemini && result.gemini.error) {
            formattedAnalysis += `- Gemini: ${result.gemini.error}\n`;
          }
        }

        setAnalysis(formattedAnalysis);
        setIsAnalyzing(false);
      })
      .catch(error => {
        console.error('Error analyzing file:', error);
        setAnalysis(`# Analysis Error\n\nFailed to analyze file: ${error.message}`);
        setIsAnalyzing(false);
      });
  }, [file, onAnalyze]);
  
  const handleSummarize = useCallback(() => {
    setIsDropdownOpen(false);
    setIsSummarizing(true);
    setSummaryDialog(true);
    setSummary("");

    // Call the API to get file analysis with a focus on Gemini
    onAnalyze?.(file, 'gemini')
      .then(result => {  
        if (result.summary) {
          setSummary(result.summary);
        } else if (result.gemini && !result.gemini.error) {
          try {
            // Handle new Gemini model response format
            const geminiResults = result.gemini.results;
            
            if (geminiResults.candidates && geminiResults.candidates.length > 0) {
              // Extract text from the first candidate
              const candidate = geminiResults.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                // Get text from the first text part
                const textParts = candidate.content.parts.filter(part => part.text);
                if (textParts.length > 0) {
                  setSummary(textParts[0].text);
                } else {
                  setSummary('No text content found in response.');
                }
              } else {
                setSummary('Unexpected response format.');
              }
            } else if (geminiResults.text) {
              // Alternative format
              setSummary(geminiResults.text);
            } else {
              // Fallback
              setSummary(`Raw response: ${JSON.stringify(geminiResults, null, 2)}`);
            }
          } catch (error) {
            setSummary(`Error generating summary: ${error.message}\nRaw response: ${JSON.stringify(result.gemini.results, null, 2)}`);
          }
        } else {
          setSummary('No summary available. Please try again later.');
        }
        
        setIsSummarizing(false);
      })
      .catch(error => {
        console.error('Error summarizing file:', error);
        setSummary(`# Summarization Error\n\nFailed to summarize file: ${error.message}`);
        setIsSummarizing(false);
      });
  }, [file, onAnalyze]);

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
                    onSelect={handleDownload}
                    className="gap-2 text-green-600"
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </span>
                  </DropdownMenuItem>
                  
                  {isDocument && (
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
      
      {/* Analysis Dialog */}
      <Dialog open={analysisDialog} onOpenChange={setAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-blue-600" />
              AI Analysis: {truncateFilename(file.name, 30)}
            </DialogTitle>
            <DialogDescription>
              Detailed AI-powered analysis of your document
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Brain className="h-12 w-12 text-blue-600 animate-pulse mb-4" />
                <p className="text-sm text-muted-foreground mb-2">AI is analyzing your document...</p>
                <p className="text-xs text-muted-foreground">Identifying key topics, entities, and insights</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <pre className="text-sm whitespace-pre-wrap font-sans bg-gray-50 p-4 rounded-md overflow-auto">
                  {analysis}
                </pre>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setAnalysisDialog(false)}
            >
              Close
            </Button>
            {!isAnalyzing && (
              <Button 
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // Here you would implement the save or export functionality
                  const blob = new Blob([analysis], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${file.name.split('.')[0]}-analysis.md`;
                  a.click();
                }}
              >
                Save Analysis
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Summary Dialog */}
      <Dialog open={summaryDialog} onOpenChange={setSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Summary: {truncateFilename(file.name, 30)}
            </DialogTitle>
            <DialogDescription>
              Concise AI-generated summary of your document
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isSummarizing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-12 w-12 text-purple-600 animate-pulse mb-4" />
                <p className="text-sm text-muted-foreground mb-2">AI is summarizing your document...</p>
                <p className="text-xs text-muted-foreground">Creating a concise overview of key points</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <pre className="text-sm whitespace-pre-wrap font-sans bg-gray-50 p-4 rounded-md overflow-auto">
                  {summary}
                </pre>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setSummaryDialog(false)}
            >
              Close
            </Button>
            {!isSummarizing && (
              <Button 
                type="button"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  // Here you would implement the save or export functionality
                  const blob = new Blob([summary], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${file.name.split('.')[0]}-summary.md`;
                  a.click();
                }}
              >
                Save Summary
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 