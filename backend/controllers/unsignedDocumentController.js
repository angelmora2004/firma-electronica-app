const UnsignedDocument = require('../models/UnsignedDocument');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir documentos
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
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

// Subir documento sin firmar
exports.uploadUnsignedDocument = async (req, res) => {
    try {
        // Usar multer para procesar el archivo
        upload.single('document')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No se ha proporcionado ningún archivo'
                });
            }

            const { fileName } = req.body;
            const userId = req.user.id;

            // Crear el documento sin firmar
            const unsignedDocument = await UnsignedDocument.create({
                fileName: fileName || req.file.originalname,
                originalData: req.file.buffer,
                userId: userId,
                isShared: false
            });

            res.status(201).json({
                success: true,
                message: 'Documento subido correctamente',
                data: {
                    id: unsignedDocument.id,
                    fileName: unsignedDocument.fileName,
                    createdAt: unsignedDocument.createdAt
                }
            });
        });

    } catch (error) {
        console.error('Error al subir documento sin firmar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al subir el documento'
        });
    }
};

// Obtener documentos sin firmar del usuario
exports.getUnsignedDocuments = async (req, res) => {
    try {
        const documents = await UnsignedDocument.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'fileName', 'isShared', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error('Error al obtener documentos sin firmar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los documentos'
        });
    }
};

// Obtener documento sin firmar específico
exports.getUnsignedDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await UnsignedDocument.findOne({
            where: { id, userId: req.user.id }
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento no encontrado'
            });
        }

        // Enviar el documento
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        res.send(document.originalData);

    } catch (error) {
        console.error('Error al obtener documento sin firmar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el documento'
        });
    }
};

// Eliminar documento sin firmar
exports.deleteUnsignedDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await UnsignedDocument.findOne({
            where: { id, userId: req.user.id }
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento no encontrado'
            });
        }

        await document.destroy();

        res.status(200).json({
            success: true,
            message: 'Documento eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar documento sin firmar:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el documento'
        });
    }
};

// Ejecutar limpieza manual de documentos sin firmar (solo para admins)
exports.runManualCleanup = async (req, res) => {
    try {
        // Verificar si el usuario es admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Solo administradores pueden ejecutar limpieza manual.'
            });
        }

        const { runCleanup } = require('../utils/cleanupUnsignedDocuments');
        const result = await runCleanup();

        res.status(200).json({
            success: true,
            message: 'Limpieza manual ejecutada correctamente',
            data: result
        });

    } catch (error) {
        console.error('Error en limpieza manual:', error);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar la limpieza manual'
        });
    }
};

// Exportar la configuración de multer para usar en las rutas
exports.upload = upload; 