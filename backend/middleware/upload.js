const multer = require('multer');
const path = require('path');

// Configuración para subir documentos PDF
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/temp_sign'));
    },
    filename: (req, file, cb) => {
        // Generar un nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `doc_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const documentUpload = multer({
    storage: documentStorage,
    fileFilter: (req, file, cb) => {
        // Solo permitir PDFs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

module.exports = {
    documentUpload
}; 