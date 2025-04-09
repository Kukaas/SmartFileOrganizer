import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  fileId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: String,
  size: Number,
  url: String,
  tags: [String],
  status: {
    type: String,
    enum: ['pending_analysis', 'analyzed', 'error'],
    default: 'pending_analysis'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Compound index for deviceId and fileId
fileSchema.index({ deviceId: 1, fileId: 1 }, { unique: true });

// Update lastModified on every save
fileSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

export const File = mongoose.model('File', fileSchema); 