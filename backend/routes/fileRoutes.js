const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta para subir un archivo (protegida con JWT)
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// Ruta para obtener un archivo (protegida con JWT)
router.get('/:filename', authMiddleware, fileController.getFile);

module.exports = router; 