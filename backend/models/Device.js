import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    language: String,
    platform: String,
    hardwareConcurrency: Number,
    screenResolution: String,
    timezone: String,
    colorDepth: Number,
    deviceMemory: String
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastSeen on every operation
deviceSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

export const Device = mongoose.model('Device', deviceSchema); 