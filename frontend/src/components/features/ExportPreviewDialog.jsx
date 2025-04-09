import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToDOCX } from '@/utils/documentExporter';
import { FileText, FileOutput, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Component for visually appealing document export previews and selection
export function ExportPreviewDialog({ 
  isOpen, 
  onClose, 
  content, 
  title, 
  filename
}) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    
    try {
      if (exportFormat === 'pdf') {
        await exportToPDF(content, `${filename}.pdf`, title);
      } else if (exportFormat === 'docx') {
        await exportToDOCX(content, `${filename}.docx`, title);
      } else if (exportFormat === 'md') {
        // Create a markdown file
        const cleanContent = content.replace(/^\$\d+$/gm, '').trim();
        const blob = new Blob([cleanContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExportSuccess(true);
      
      // Close dialog after success message is shown briefly
      setTimeout(() => {
        if (exportSuccess) onClose();
      }, 1500);
      
    } catch (error) {
      console.error(`Error exporting document:`, error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-4">
        <DialogHeader className="pb-1 space-y-0.5">
          <DialogTitle className="text-base flex items-center gap-1.5">
            <FileOutput className="h-3.5 w-3.5 text-blue-600" />
            Export Document
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Choose a format to export "{title}"
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="pdf" 
          value={exportFormat} 
          onValueChange={setExportFormat}
          className="mt-1"
        >
          <TabsList className="grid grid-cols-3 mb-2 w-full h-8">
            <TabsTrigger value="pdf" className="text-xs h-full data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              <FileText className="h-3 w-3 mr-1 text-red-500" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="docx" className="text-xs h-full data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <FileText className="h-3 w-3 mr-1 text-blue-500" />
              DOCX
            </TabsTrigger>
            <TabsTrigger value="md" className="text-xs h-full data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
              <FileText className="h-3 w-3 mr-1 text-gray-500" />
              MD
            </TabsTrigger>
          </TabsList>
          
          <div className="relative">
            {/* Format Preview Containers */}
            <TabsContent value="pdf" className="mt-0">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm aspect-[0.707/0.5] bg-white rounded-lg shadow-md overflow-hidden border-2 border-red-200 flex flex-col">
                  {/* PDF Preview */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-1.5 border-b border-red-200">
                    <h3 className="text-xs font-semibold text-red-800 truncate">{title}</h3>
                    <div className="w-full h-0.5 bg-red-300 mt-0.5 rounded-full"></div>
                  </div>
                  <div className="flex-1 p-1.5 bg-white overflow-hidden">
                    <div className="space-y-0.5">
                      {/* Simulate document content with faded lines */}
                      <div className="h-1 bg-red-100 rounded w-full"></div>
                      <div className="h-1 bg-red-100 rounded w-5/6"></div>
                      <div className="h-1 bg-red-100 rounded w-4/6"></div>
                      <div className="h-0.5 bg-red-50 rounded w-full mt-1"></div>
                      <div className="h-0.5 bg-red-50 rounded w-full"></div>
                      <div className="h-0.5 bg-red-50 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="px-1.5 py-0.5 bg-red-50 text-[8px] text-red-500 flex justify-between border-t border-red-100">
                    <span>Generated: {new Date().toLocaleDateString()}</span>
                    <span>PDF Format</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Professional PDF document with headings
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="docx" className="mt-0">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm aspect-[0.707/0.5] bg-white rounded-lg shadow-md overflow-hidden border-2 border-blue-200 flex flex-col">
                  {/* Word Preview */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-1.5 border-b border-blue-200">
                    <h3 className="text-xs font-semibold text-blue-800 truncate">{title}</h3>
                    <div className="w-full h-0.5 bg-blue-300 mt-0.5 rounded-full"></div>
                  </div>
                  <div className="flex-1 p-1.5 bg-white overflow-hidden">
                    <div className="space-y-0.5">
                      {/* Simulate document content with faded lines */}
                      <div className="h-1 bg-blue-100 rounded w-full"></div>
                      <div className="h-1 bg-blue-100 rounded w-5/6"></div>
                      <div className="h-1 bg-blue-100 rounded w-4/6"></div>
                      <div className="h-0.5 bg-blue-50 rounded w-full mt-1"></div>
                      <div className="h-0.5 bg-blue-50 rounded w-full"></div>
                      <div className="h-0.5 bg-blue-50 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="px-1.5 py-0.5 bg-blue-50 text-[8px] text-blue-500 flex justify-between border-t border-blue-100">
                    <span>Generated: {new Date().toLocaleDateString()}</span>
                    <span>DOCX Format</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Editable Word document
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="md" className="mt-0">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm aspect-[0.707/0.5] bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200 flex flex-col">
                  {/* Markdown Preview */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-1.5 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-800 truncate">{title}</h3>
                    <div className="w-full h-0.5 bg-gray-300 mt-0.5 rounded-full"></div>
                  </div>
                  <div className="flex-1 p-1.5 bg-gray-50 overflow-hidden font-mono text-[8px]">
                    <div className="space-y-0.5">
                      {/* Simulate markdown content */}
                      <div className="text-gray-600">
                        <span className="text-gray-400"># </span>Title
                      </div>
                      <div className="text-gray-600">
                        <span className="text-gray-400">## </span>Section
                      </div>
                      <div className="text-gray-600 ml-0.5">
                        <span className="text-gray-400">- </span>Bullet point
                      </div>
                      <div className="text-gray-600 ml-0.5">
                        <span className="text-gray-400">- </span>Another point
                      </div>
                      <div className="text-gray-500">
                        Regular text...
                      </div>
                    </div>
                  </div>
                  <div className="px-1.5 py-0.5 bg-gray-100 text-[8px] text-gray-500 flex justify-between border-t border-gray-200">
                    <span>Plain text format</span>
                    <span>Markdown</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Simple text format
                </p>
              </div>
            </TabsContent>
            
            {/* Success overlay */}
            {exportSuccess && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center flex-col">
                <CheckCircle className="h-6 w-6 text-green-500 mb-1" />
                <p className="text-sm font-medium text-gray-800">Export Successful!</p>
                <p className="text-[10px] text-gray-500">Document saved</p>
              </div>
            )}
          </div>
        </Tabs>
        
        <div className="flex items-center justify-end gap-2 mt-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={exporting}
            className="h-7 px-2 text-xs"
          >
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={handleExport}
            disabled={exporting || exportSuccess}
            className="h-7 px-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {exporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 