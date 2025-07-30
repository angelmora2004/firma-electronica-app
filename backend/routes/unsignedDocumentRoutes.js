const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const unsignedDocumentController = require('../controllers/unsignedDocumentController');

// Rutas para documentos sin firmar
router.post('/upload', auth, unsignedDocumentController.uploadUnsignedDocument);
router.get('/', auth, unsignedDocumentController.getUnsignedDocuments);
router.get('/:id', auth, unsignedDocumentController.getUnsignedDocument);
router.delete('/:id', auth, unsignedDocumentController.deleteUnsignedDocument);
router.post('/cleanup', auth, unsignedDocumentController.runManualCleanup);

module.exports = router; 