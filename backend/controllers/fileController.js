import { Device } from '../models/Device.js';
import { File } from '../models/File.js';

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
            lastModified: new Date()
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

      // Find the specific file by both deviceId and fileId
      const file = await File.findOneAndUpdate(
        { deviceId, fileId },
        { 
          $set: {
            ...updates,
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