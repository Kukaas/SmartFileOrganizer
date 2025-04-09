import express from 'express';
import { fileController } from '../controllers/fileController.js';

const router = express.Router();

// File routes
router.post('/sync', fileController.syncFiles);
router.get('/', fileController.getFiles);
router.patch('/:fileId', fileController.updateFile);
router.delete('/:fileId', fileController.deleteFile);

// Device routes
router.get('/device/info', fileController.getDeviceInfo);

export default router; 