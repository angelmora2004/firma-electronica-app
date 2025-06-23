const express = require('express');
const router = express.Router();
const { uploadSignature, getSignatures, unlockSignature, downloadSignature } = require('../controllers/signatureController');
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

module.exports = router; 