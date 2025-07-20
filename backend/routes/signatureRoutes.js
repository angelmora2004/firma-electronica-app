const express = require('express');
const router = express.Router();
const { uploadSignature, getSignatures, unlockSignature, downloadSignature, signDocument, getCertInfo } = require('../controllers/signatureController');
const { getSignedDocuments, downloadSignedDocument, deleteSignedDocument } = require('../controllers/signedDocumentController');
const authMiddleware = require('../middleware/authMiddleware');
const signatureUpload = require('../middleware/signatureUpload');

// @route   POST api/signatures/upload
// @desc    Upload, encrypt, and save a signature file
// @access  Private
router.post(
    '/upload',
    authMiddleware,
    signatureUpload.single('file'),
    uploadSignature
);

// @route   GET api/signatures
// @desc    Get all signatures for a user
// @access  Private
router.get(
    '/',
    authMiddleware,
    getSignatures
);

// @route   POST api/signatures/:id/unlock
// @desc    Unlock a signature by providing the password
// @access  Private
router.post(
    '/:id/unlock',
    authMiddleware,
    unlockSignature
);

// @route   GET api/signatures/:id/download
// @desc    Download a signature file by providing the password
// @access  Private
router.get(
    '/:id/download',
    authMiddleware,
    downloadSignature
);

// @route   POST api/signatures/sign-document
// @desc    Sign a PDF document with digital signature and QR stamp
// @access  Private
router.post(
    '/sign-document',
    authMiddleware,
    signDocument
);

// @route   POST api/signatures/:id/cert-info
// @desc    Obtener datos del certificado de una firma
// @access  Private
router.post(
    '/:id/cert-info',
    authMiddleware,
    getCertInfo
);

// Rutas para documentos firmados
router.get('/signed-documents', authMiddleware, getSignedDocuments);
router.get('/signed-documents/:id/download', authMiddleware, downloadSignedDocument);
router.delete('/signed-documents/:id', authMiddleware, deleteSignedDocument);

module.exports = router; 