const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { documentUpload } = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta para subir un archivo (protegida con JWT)
router.post('/upload', authMiddleware, fileController.uploadFile);

// Ruta para obtener un archivo (protegida con JWT)
router.get('/:filename', authMiddleware, fileController.getFile);

// @route   POST api/files/upload-for-signing
// @desc    Upload a PDF document for signing
// @access  Private
router.post(
    '/upload-for-signing',
    authMiddleware,
    documentUpload.single('document'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo.' });
        }

        res.status(200).json({
            message: 'Documento subido correctamente para firma.',
            documentId: req.file.filename,
            originalName: req.file.originalname
        });
    }
);

module.exports = router; 