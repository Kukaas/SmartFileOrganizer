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
  content: {
    type: String,    // Store encrypted base64 content
    select: false    // Don't return by default in queries for performance
  },
  tags: [String],
  status: {
    type: String,
    enum: ['pending_analysis', 'analyzed', 'analyzing', 'summarizing', 'error'],
    default: 'pending_analysis'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  fileExtension: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['image', 'document', 'archive', 'code', 'media', 'other'],
    default: 'other'
  },
  analysis: {
    huggingface: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    gemini: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    lastAnalyzed: Date
  },
  summary: {
    content: String,
    lastGenerated: Date
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
  
  // Extract file extension if not set
  if (!this.fileExtension && this.name) {
    const nameParts = this.name.split('.');
    if (nameParts.length > 1) {
      this.fileExtension = nameParts.pop().toLowerCase();
    }
  }
  
  // Determine file category if not set
  if (!this.category || this.category === 'other') {
    // Check type and extension to determine category
    const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
    const codeExtensions = ['js', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'php', 'rb', 'ts', 'jsx', 'tsx'];
    const archiveExtensions = ['zip', 'rar', 'tar', 'gz', '7z'];
    
    if (this.type && this.type.startsWith('image/')) {
      this.category = 'image';
    } else if (this.type && (this.type.startsWith('video/') || this.type.startsWith('audio/'))) {
      this.category = 'media';
    } else if (this.fileExtension) {
      if (docExtensions.includes(this.fileExtension)) {
        this.category = 'document';
      } else if (codeExtensions.includes(this.fileExtension)) {
        this.category = 'code';
      } else if (archiveExtensions.includes(this.fileExtension)) {
        this.category = 'archive';
      }
    }
  }
  
  next();
});

export const File = mongoose.model('File', fileSchema); 