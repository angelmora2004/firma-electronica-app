const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const signatureRequestController = require('../controllers/signatureRequestController');

// Rutas para solicitudes de firma
router.post('/send', auth, signatureRequestController.sendSignatureRequest);
router.get('/received', auth, signatureRequestController.getReceivedRequests);
router.get('/sent', auth, signatureRequestController.getSentRequests);
router.get('/:id/document', auth, signatureRequestController.getDocumentForSignature);
router.put('/:id/sign', auth, signatureRequestController.signDocument);
router.put('/:id/reject', auth, signatureRequestController.rejectSignatureRequest);
router.delete('/:id', auth, signatureRequestController.deleteSignatureRequest);
router.get('/:id/download-signed', auth, signatureRequestController.downloadSignedDocument);
router.get('/download-signed/:documentId/:documentType', auth, signatureRequestController.downloadSignedDocumentByDocument);

module.exports = router; 