const express = require('express');
const router = express.Router();
const signedDocumentController = require('../controllers/signedDocumentController');
const authMiddleware = require('../middleware/authMiddleware');

// Obtener documentos firmados del usuario
router.get('/', authMiddleware, signedDocumentController.getSignedDocuments);

// Descargar documento firmado
router.get('/:id/download', authMiddleware, signedDocumentController.downloadSignedDocument);

// Eliminar documento firmado
router.delete('/:id', authMiddleware, signedDocumentController.deleteSignedDocument);

module.exports = router; 