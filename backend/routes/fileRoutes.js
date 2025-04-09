import express from 'express';
import fetch from 'node-fetch';
import { fileController } from '../controllers/fileController.js';
import { folderController } from '../controllers/folderController.js';

const router = express.Router();

// Apply size limits to specific routes
const jsonParser = express.json({ limit: '100mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '100mb' });

// Test route to check API key configuration
router.get('/test-api-keys', async (req, res) => {
  try {
    const hfKey = process.env.AI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    const response = {
      huggingface: {
        keyAvailable: !!hfKey,
        keyPrefix: hfKey ? `${hfKey.substring(0, 4)}...` : 'N/A'
      },
      gemini: {
        keyAvailable: !!geminiKey,
        keyPrefix: geminiKey ? `${geminiKey.substring(0, 4)}...` : 'N/A'
      }
    };
    
    // Test a simple Gemini request with updated model name
    if (geminiKey) {
      try {
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: "Hello, please respond with 'Gemini API is working'" }]
            }]
          })
        });
        
        const result = await testResponse.json();
        response.gemini.testResult = testResponse.ok ? 'Success' : 'Failed';
        response.gemini.statusCode = testResponse.status;
        response.gemini.details = result;
      } catch (error) {
        response.gemini.testResult = 'Error';
        response.gemini.error = error.message;
      }
    }
    
    // Test a simple Hugging Face request
    if (hfKey) {
      try {
        const testResponse = await fetch(`https://api-inference.huggingface.co/models/gpt2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: "Hello, I'm a test request" })
        });
        
        const result = await testResponse.text();
        response.huggingface.testResult = testResponse.ok ? 'Success' : 'Failed';
        response.huggingface.statusCode = testResponse.status;
        response.huggingface.details = result.substring(0, 100) + '...';
      } catch (error) {
        response.huggingface.testResult = 'Error';
        response.huggingface.error = error.message;
      }
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File routes
router.post('/sync', jsonParser, fileController.syncFiles);
router.get('/', fileController.getFiles);
router.patch('/:fileId', jsonParser, fileController.updateFile);
router.delete('/:fileId', fileController.deleteFile);
router.get('/:fileId/download', fileController.downloadFile);
router.post('/:fileId/analyze', jsonParser, fileController.analyzeFile);
router.get('/:fileId/analysis', fileController.getFileAnalysis);

// Folder routes
router.get('/folders', folderController.getFolders);
router.post('/folders', jsonParser, folderController.createFolder);
router.patch('/folders/:folderId', jsonParser, folderController.updateFolder);
router.delete('/folders/:folderId', folderController.deleteFolder);
router.post('/move-files', jsonParser, folderController.moveFiles);

// Device routes
router.get('/device/info', fileController.getDeviceInfo);

export default router; 