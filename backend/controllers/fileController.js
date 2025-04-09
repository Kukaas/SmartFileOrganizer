import { Device } from '../models/Device.js';
import { File } from '../models/File.js';
import { Folder } from '../models/Folder.js';
import { encryptContent, decryptContent } from '../utils/encryption.js';
import { analyzeWithHuggingFace, analyzeWithGemini, summarizeWithGemini } from '../utils/aiService.js';

// Get or create device
const getOrCreateDevice = async (deviceId, deviceInfo) => {
  let device = await Device.findOne({ deviceId });
  
  if (!device) {
    device = new Device({
      deviceId,
      deviceInfo
    });
    await device.save();
  } else {
    device.lastSeen = new Date();
    device.deviceInfo = { ...device.deviceInfo, ...deviceInfo };
    await device.save();
  }
  
  return device;
};

// Helper function to get folder path
const getFolderPath = async (deviceId, folderId) => {
  if (!folderId) return '/';
  
  const folder = await Folder.findOne({ deviceId, folderId });
  return folder ? folder.path : '/';
};

export const fileController = {
  // Sync files for a device
  syncFiles: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { files } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Update device information
      await getOrCreateDevice(deviceId, req.body.deviceInfo);

      // Process each file
      const fileOperations = files.map(async (file) => {
        // Ensure we have a valid fileId
        if (!file.fileId) {
          console.error('File missing fileId:', file);
          return null;
        }
        
        // Extract file extension if available
        let fileExtension = '';
        if (file.name) {
          const nameParts = file.name.split('.');
          if (nameParts.length > 1) {
            fileExtension = nameParts.pop().toLowerCase();
          }
        }
        
        // Determine file category
        let category = 'other';
        const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
        const codeExtensions = ['js', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'php', 'rb', 'ts', 'jsx', 'tsx'];
        const archiveExtensions = ['zip', 'rar', 'tar', 'gz', '7z'];
        
        if (file.type && file.type.startsWith('image/')) {
          category = 'image';
        } else if (file.type && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
          category = 'media';
        } else if (fileExtension) {
          if (docExtensions.includes(fileExtension)) {
            category = 'document';
          } else if (codeExtensions.includes(fileExtension)) {
            category = 'code';
          } else if (archiveExtensions.includes(fileExtension)) {
            category = 'archive';
          }
        }
        
        // Handle file content if present
        let encryptedContent = undefined;
        if (file.content) {
          try {
            encryptedContent = encryptContent(file.content);
          } catch (error) {
            console.error(`Error encrypting content for file ${file.fileId}:`, error);
          }
        }
        
        // Get the folder path if file has a folderId
        const folderPath = await getFolderPath(deviceId, file.folderId);
        
        return File.findOneAndUpdate(
          { deviceId, fileId: file.fileId },
          {
            deviceId,
            fileId: file.fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url,
            tags: file.tags,
            status: file.status,
            dateAdded: file.dateAdded,
            lastModified: new Date(),
            fileExtension,
            category,
            folderId: file.folderId || null,
            folderPath,
            ...(encryptedContent && { content: encryptedContent })
          },
          { upsert: true, new: true }
        );
      });

      // Filter out any null operations and execute the rest
      const results = await Promise.all(fileOperations.filter(op => op !== null));

      // Get updated files list
      const updatedFiles = await File.find({ deviceId });
      res.json(updatedFiles);
    } catch (error) {
      console.error('Error syncing files:', error);
      res.status(500).json({ error: 'Failed to sync files' });
    }
  },

  // Get files for a device
  getFiles: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { folderId = null } = req.query;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Update device last seen
      await Device.findOneAndUpdate(
        { deviceId },
        { lastSeen: new Date() }
      );

      // Get files based on folder
      let files;
      if (folderId === 'null' || folderId === 'undefined' || folderId === '') {
        // Get root files (no folder)
        files = await File.find({ deviceId, folderId: null });
      } else if (folderId) {
        // Get files in a specific folder
        files = await File.find({ deviceId, folderId });
      } else {
        // Get all files regardless of folder
        files = await File.find({ deviceId });
      }

      res.json(files);
    } catch (error) {
      console.error('Error getting files:', error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  },

  // Update a file
  updateFile: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileId } = req.params;
      const updates = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Handle file content if present
      let encryptedContent;
      if (updates.content) {
        try {
          encryptedContent = encryptContent(updates.content);
          // Remove the original content from updates
          delete updates.content;
        } catch (error) {
          console.error(`Error encrypting content for file ${fileId}:`, error);
          return res.status(500).json({ error: 'Failed to encrypt file content' });
        }
      }

      // Update folder path if folderId is being updated
      let folderPath = undefined;
      if (updates.folderId !== undefined) {
        folderPath = await getFolderPath(deviceId, updates.folderId);
      }

      // Find the specific file by both deviceId and fileId
      const file = await File.findOneAndUpdate(
        { deviceId, fileId },
        { 
          $set: {
            ...updates,
            ...(folderPath !== undefined && { folderPath }),
            ...(encryptedContent && { content: encryptedContent }),
            lastModified: new Date()
          }
        },
        { new: true }
      );

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json(file);
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  },

  // Download a file
  downloadFile: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileId } = req.params;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Get the file with content
      const file = await File.findOne({ deviceId, fileId }).select('+content');

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!file.content) {
        return res.status(404).json({ error: 'File content not available' });
      }

      try {
        // Decrypt the content
        const decryptedContent = decryptContent(file.content);
        
        // Return the decrypted content
        res.json({
          fileId: file.fileId,
          name: file.name,
          type: file.type,
          content: decryptedContent,
          folderId: file.folderId,
          folderPath: file.folderPath
        });
      } catch (error) {
        console.error(`Error decrypting content for file ${fileId}:`, error);
        return res.status(500).json({ error: 'Failed to decrypt file content' });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  },

  // Analyze a file with AI
  analyzeFile: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileId } = req.params;
      const { service = 'both', type = 'analyze' } = req.query; // 'huggingface', 'gemini', or 'both' and 'analyze' or 'summarize'

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Find the file and include content for analysis
      const file = await File.findOne({ deviceId, fileId }).select('+content');

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!file.content) {
        return res.status(400).json({ error: 'File content not available for analysis' });
      }

      try {
        // Update file status to analyzing/summarizing
        const newStatus = type === 'analyze' ? 'analyzing' : 'summarizing';
        file.status = newStatus;
        await file.save();
      } catch (error) {
        console.error('Error updating file status:', error);
        // If status validation fails, continue with the existing status
        // but log the error (don't return an error response yet)
      }

      let hfResults = null;
      let geminiResults = null;
      let summary = null;

      // If this is a summary request
      if (type === 'summarize') {
        try {
          console.log(`Starting file summarization for fileId: ${fileId}`);
          const summaryResult = await summarizeWithGemini(file).catch(error => {
            console.error('Error in summarizeWithGemini:', error);
            throw new Error(`Summarization failed: ${error.message}`);
          });
          
          geminiResults = summaryResult;
          
          // Extract the text from Gemini's summary response
          try {
            if (summaryResult.results && 
                summaryResult.results.candidates && 
                summaryResult.results.candidates.length > 0) {
              const candidate = summaryResult.results.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                // Get text from the first text part
                const textParts = candidate.content.parts.filter(part => part.text);
                if (textParts.length > 0) {
                  summary = textParts[0].text;
                }
              }
            }
            
            if (summary) {
              // Update the file with the summary
              await File.findOneAndUpdate(
                { deviceId, fileId },
                { 
                  $set: {
                    'summary.content': summary,
                    'summary.lastGenerated': new Date(),
                    status: 'analyzed'
                  }
                }
              );
            } else {
              console.warn(`No summary text could be extracted from the Gemini response for fileId: ${fileId}`);
              // Still set status back to analyzed if no summary could be extracted
              await File.findOneAndUpdate(
                { deviceId, fileId },
                { $set: { status: 'analyzed' }}
              );
            }
          } catch (error) {
            console.error('Error extracting or saving summary:', error);
            // Make sure we set the status back to analyzed even if extraction fails
            await File.findOneAndUpdate(
              { deviceId, fileId },
              { $set: { status: 'analyzed' }}
            );
          }
          
          return res.json({
            fileId,
            type: 'summary',
            status: 'analyzed',
            gemini: geminiResults,
            summary: summary,
            folderId: file.folderId,
            folderPath: file.folderPath
          });
        } catch (error) {
          console.error('Error generating summary:', error);
          
          // Update file status to error
          try {
            await File.findOneAndUpdate(
              { deviceId, fileId },
              { $set: { status: 'error' } }
            );
          } catch (updateError) {
            console.error('Error updating file status to error:', updateError);
          }
          
          return res.status(500).json({ 
            error: 'Failed to generate summary', 
            details: error.message 
          });
        }
      }
      
      // This is a standard analysis request
      try {
        // Run the selected AI services analysis
        if (service === 'huggingface' || service === 'both') {
          hfResults = await analyzeWithHuggingFace(file).catch(error => {
            console.error('Error in analyzeWithHuggingFace:', error);
            return {
              source: 'huggingface',
              error: `Analysis failed: ${error.message}`,
              status: 'error'
            };
          });
        }
        
        if (service === 'gemini' || service === 'both') {
          geminiResults = await analyzeWithGemini(file).catch(error => {
            console.error('Error in analyzeWithGemini:', error);
            return {
              source: 'gemini',
              error: `Analysis failed: ${error.message}`,
              status: 'error'
            };
          });
        }

        // Update file with analysis results
        const analysisUpdates = {
          status: 'analyzed',
          'analysis.lastAnalyzed': new Date()
        };

        if (hfResults) {
          analysisUpdates['analysis.huggingface'] = hfResults;
        }

        if (geminiResults) {
          analysisUpdates['analysis.gemini'] = geminiResults;
        }

        // Generate a summary from the Gemini analysis
        if (geminiResults && !geminiResults.error) {
          try {
            // Extract the text from Gemini's response using the new format
            let geminiText = '';
            
            if (geminiResults.results.candidates && geminiResults.results.candidates.length > 0) {
              const candidate = geminiResults.results.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                // Get text from the first text part
                const textParts = candidate.content.parts.filter(part => part.text);
                if (textParts.length > 0) {
                  geminiText = textParts[0].text;
                }
              }
            }
            
            if (geminiText) {
              summary = geminiText;
              analysisUpdates['summary.content'] = summary;
              analysisUpdates['summary.lastGenerated'] = new Date();
            }
          } catch (error) {
            console.error('Error extracting summary from analysis:', error);
          }
        }

        // Update the file with analysis results
        const updatedFile = await File.findOneAndUpdate(
          { deviceId, fileId },
          { $set: analysisUpdates },
          { new: true }
        );

        res.json({
          fileId,
          status: 'analyzed',
          huggingface: hfResults,
          gemini: geminiResults,
          summary: summary,
          folderId: file.folderId,
          folderPath: file.folderPath
        });
      } catch (error) {
        console.error('Error in analysis process:', error);
        
        // Update file status to error
        try {
          await File.findOneAndUpdate(
            { deviceId, fileId },
            { $set: { status: 'error' } }
          );
        } catch (updateError) {
          console.error('Error updating file status to error:', updateError);
        }
        
        res.status(500).json({ 
          error: 'Failed to analyze file',
          details: error.message
        });
      }
    } catch (error) {
      console.error('Error in analyzeFile controller:', error);
      
      // Only attempt to update status if we have deviceId and fileId
      if (req.headers['x-device-id'] && req.params.fileId) {
        try {
          await File.findOneAndUpdate(
            { 
              deviceId: req.headers['x-device-id'], 
              fileId: req.params.fileId 
            },
            { $set: { status: 'error' } }
          );
        } catch (updateError) {
          console.error('Error updating file status to error:', updateError);
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to process file',
        details: error.message
      });
    }
  },

  // Get analysis for a file
  getFileAnalysis: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileId } = req.params;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      const file = await File.findOne({ deviceId, fileId });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        fileId,
        status: file.status,
        analysis: file.analysis || {},
        summary: file.summary || {},
        folderId: file.folderId,
        folderPath: file.folderPath
      });
    } catch (error) {
      console.error('Error getting file analysis:', error);
      res.status(500).json({ error: 'Failed to get file analysis' });
    }
  },

  // Delete a file
  deleteFile: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileId } = req.params;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      const file = await File.findOneAndDelete({ deviceId, fileId });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  },

  // Get device info
  getDeviceInfo: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      const device = await Device.findOne({ deviceId });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json(device);
    } catch (error) {
      console.error('Error getting device info:', error);
      res.status(500).json({ error: 'Failed to get device info' });
    }
  }
}; 