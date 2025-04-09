import { Device } from '../models/Device.js';
import { File } from '../models/File.js';
import { encryptContent, decryptContent } from '../utils/encryption.js';
import { analyzeWithHuggingFace, analyzeWithGemini } from '../utils/aiService.js';

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
        
        // Handle file content if present
        let encryptedContent = undefined;
        if (file.content) {
          try {
            encryptedContent = encryptContent(file.content);
          } catch (error) {
            console.error(`Error encrypting content for file ${file.fileId}:`, error);
          }
        }
        
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

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Update device last seen
      await Device.findOneAndUpdate(
        { deviceId },
        { lastSeen: new Date() }
      );

      const files = await File.find({ deviceId });
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

      // Find the specific file by both deviceId and fileId
      const file = await File.findOneAndUpdate(
        { deviceId, fileId },
        { 
          $set: {
            ...updates,
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
          content: decryptedContent
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
      const { service = 'both' } = req.query; // 'huggingface', 'gemini', or 'both'

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

      // Update file status to analyzing
      file.status = 'analyzing';
      await file.save();

      let hfResults = null;
      let geminiResults = null;

      // Run the selected AI services analysis
      if (service === 'huggingface' || service === 'both') {
        hfResults = await analyzeWithHuggingFace(file);
      }
      
      if (service === 'gemini' || service === 'both') {
        geminiResults = await analyzeWithGemini(file);
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
      let summary = null;
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
          console.error('Error extracting summary:', error);
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
        summary: summary
      });
    } catch (error) {
      console.error('Error analyzing file:', error);
      
      // Update file status to error
      await File.findOneAndUpdate(
        { deviceId: req.headers['x-device-id'], fileId: req.params.fileId },
        { $set: { status: 'error' } }
      );
      
      res.status(500).json({ error: 'Failed to analyze file' });
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
        summary: file.summary || {}
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