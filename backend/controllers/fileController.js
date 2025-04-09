import { Device } from '../models/Device.js';
import { File } from '../models/File.js';
import { encryptContent, decryptContent } from '../utils/encryption.js';

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