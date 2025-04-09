import { Device } from '../models/Device.js';
import { Folder } from '../models/Folder.js';
import { File } from '../models/File.js';

// Get or create device (reused from fileController)
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

// Helper function to update path for a folder and its children
const updateFolderPath = async (deviceId, folderId, newPath) => {
  // Update the current folder path
  await Folder.findOneAndUpdate(
    { deviceId, folderId },
    { path: newPath }
  );
  
  // Get all child folders
  const childFolders = await Folder.find({ deviceId, parentId: folderId });
  
  // Update each child folder and its children recursively
  for (const childFolder of childFolders) {
    const childPath = `${newPath}/${childFolder.name}`;
    await updateFolderPath(deviceId, childFolder.folderId, childPath);
  }
  
  // Update all files in this folder
  await File.updateMany(
    { deviceId, folderId },
    { folderPath: newPath }
  );
};

export const folderController = {
  // Get all folders for a device
  getFolders: async (req, res) => {
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

      const folders = await Folder.find({ deviceId });
      res.json(folders);
    } catch (error) {
      console.error('Error getting folders:', error);
      res.status(500).json({ error: 'Failed to get folders' });
    }
  },

  // Create a new folder
  createFolder: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { name, parentId = null } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      // Update device information
      await getOrCreateDevice(deviceId, req.body.deviceInfo);

      // Generate unique folder ID
      const folderId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      // Determine folder path
      let path = '/';
      
      if (parentId) {
        // If this is a subfolder, get the parent folder to build the path
        const parentFolder = await Folder.findOne({ deviceId, folderId: parentId });
        
        if (!parentFolder) {
          return res.status(404).json({ error: 'Parent folder not found' });
        }
        
        path = `${parentFolder.path}/${name}`;
      } else {
        path = `/${name}`;
      }

      // Create the folder
      const folder = new Folder({
        deviceId,
        folderId,
        name,
        parentId,
        path
      });

      await folder.save();
      
      // Get all folders (to return the updated folder list)
      const folders = await Folder.find({ deviceId });
      res.json(folders);
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  },

  // Update a folder
  updateFolder: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { folderId } = req.params;
      const { name, parentId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Find the folder
      const folder = await Folder.findOne({ deviceId, folderId });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Handle name change and/or parent change
      let updatedFolder = { ...folder._doc };
      let pathChanged = false;
      
      if (name && name !== folder.name) {
        updatedFolder.name = name;
        pathChanged = true;
      }
      
      if (parentId !== undefined && parentId !== folder.parentId) {
        // Prevent moving a folder into itself or its descendants
        if (parentId === folderId) {
          return res.status(400).json({ error: 'Cannot move a folder into itself' });
        }
        
        if (parentId !== null) {
          // Check if the target parent exists
          const parentFolder = await Folder.findOne({ deviceId, folderId: parentId });
          
          if (!parentFolder) {
            return res.status(404).json({ error: 'Target parent folder not found' });
          }
          
          // Check if trying to move into a descendant folder
          let currentParent = parentFolder;
          while (currentParent && currentParent.parentId) {
            if (currentParent.parentId === folderId) {
              return res.status(400).json({ error: 'Cannot move a folder into its descendant' });
            }
            currentParent = await Folder.findOne({ deviceId, folderId: currentParent.parentId });
          }
          
          updatedFolder.parentId = parentId;
          pathChanged = true;
        } else {
          // Moving to root
          updatedFolder.parentId = null;
          pathChanged = true;
        }
      }
      
      // Update the folder
      if (pathChanged) {
        // Calculate new path
        let newPath = '/';
        
        if (updatedFolder.parentId) {
          const parentFolder = await Folder.findOne({ deviceId, folderId: updatedFolder.parentId });
          newPath = `${parentFolder.path}/${updatedFolder.name}`;
        } else {
          newPath = `/${updatedFolder.name}`;
        }
        
        // Update folder in database
        const updated = await Folder.findOneAndUpdate(
          { deviceId, folderId },
          { name: updatedFolder.name, parentId: updatedFolder.parentId, path: newPath, lastModified: new Date() },
          { new: true }
        );
        
        // Update paths for all children (folders and files)
        await updateFolderPath(deviceId, folderId, newPath);
      } else {
        // Just update the lastModified if only other fields changed
        await Folder.findOneAndUpdate(
          { deviceId, folderId },
          { lastModified: new Date() }
        );
      }

      // Get all folders to return updated list
      const folders = await Folder.find({ deviceId });
      res.json(folders);
    } catch (error) {
      console.error('Error updating folder:', error);
      res.status(500).json({ error: 'Failed to update folder' });
    }
  },

  // Delete a folder and its contents
  deleteFolder: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { folderId } = req.params;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Find the folder
      const folder = await Folder.findOne({ deviceId, folderId });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Get all subfolders recursively
      const getAllSubfolderIds = async (parentId) => {
        const subfolders = await Folder.find({ deviceId, parentId });
        let folderIds = [parentId];
        
        for (const subfolder of subfolders) {
          const childIds = await getAllSubfolderIds(subfolder.folderId);
          folderIds = [...folderIds, ...childIds];
        }
        
        return folderIds;
      };
      
      const folderIds = await getAllSubfolderIds(folderId);
      
      // Delete all files in the folders
      await File.deleteMany({ deviceId, folderId: { $in: folderIds } });
      
      // Delete all folders
      await Folder.deleteMany({ deviceId, folderId: { $in: folderIds } });

      // Get remaining folders
      const folders = await Folder.find({ deviceId });
      res.json(folders);
    } catch (error) {
      console.error('Error deleting folder:', error);
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  },
  
  // Move files to a folder
  moveFiles: async (req, res) => {
    try {
      const deviceId = req.headers['x-device-id'];
      const { fileIds, targetFolderId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'File IDs are required' });
      }

      // Verify target folder exists if not null
      let folderPath = '/';
      if (targetFolderId) {
        const targetFolder = await Folder.findOne({ deviceId, folderId: targetFolderId });
        
        if (!targetFolder) {
          return res.status(404).json({ error: 'Target folder not found' });
        }
        
        folderPath = targetFolder.path;
      }

      // Update files' folder information
      await File.updateMany(
        { deviceId, fileId: { $in: fileIds } },
        { $set: { folderId: targetFolderId, folderPath, lastModified: new Date() } }
      );

      // Get updated files
      const updatedFiles = await File.find({ deviceId, fileId: { $in: fileIds } });
      res.json(updatedFiles);
    } catch (error) {
      console.error('Error moving files:', error);
      res.status(500).json({ error: 'Failed to move files' });
    }
  }
}; 