import crypto from 'crypto';

// Encryption settings
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts file content as base64
 * @param {string} content - The base64 file content to encrypt
 * @returns {string} - Encrypted content
 */
export const encryptContent = (content) => {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher using the key and iv
    const cipher = crypto.createCipheriv(
      ALGORITHM, 
      Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32)), 
      iv
    );
    
    // Encrypt the content
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine the IV and encrypted content
    // This allows us to use a different IV for each encryption
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt content');
  }
};

/**
 * Decrypts encrypted content
 * @param {string} encryptedContent - The encrypted content
 * @returns {string} - Decrypted content as base64
 */
export const decryptContent = (encryptedContent) => {
  try {
    // Split the IV and content
    const parts = encryptedContent.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted content format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32)), 
      iv
    );
    
    // Decrypt the content
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt content');
  }
}; 