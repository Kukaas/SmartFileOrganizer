import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  folderId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  parentId: {
    type: String,
    default: null, // null means it's a root folder
  },
  path: {
    type: String,
    default: '/' // Default path for root folders
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Compound index for deviceId and folderId
folderSchema.index({ deviceId: 1, folderId: 1 }, { unique: true });

// Update lastModified on every save
folderSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

export const Folder = mongoose.model('Folder', folderSchema); 