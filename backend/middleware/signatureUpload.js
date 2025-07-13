const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Guardamos las firmas temporalmente en la misma carpeta de subidas
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para aceptar solo archivos de firma .p12 y .pfx
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/x-pkcs12'];
    const allowedExtensions = ['.p12', '.pfx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de firma (.p12, .pfx)'), false);
    }
};

// Configuración de multer para firmas
const signatureUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // Límite de 2MB para firmas
    }
});

module.exports = signatureUpload; 