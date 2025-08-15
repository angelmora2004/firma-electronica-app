const express = require('express');
const router = express.Router();
const certificateAuth = require('../middleware/certificateAuth');
const adminAuth = require('../middleware/adminAuth');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas protegidas por autenticación JWT
router.use(authMiddleware);

// Generar certificado para un usuario (solo admin)
router.post('/generate/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { userName } = req.body;

        if (!userName) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario es requerido'
            });
        }

        // Verificar si el usuario ya tiene certificado
        if (certificateAuth.hasValidCertificate(userId)) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya tiene un certificado válido'
            });
        }

        // Generar certificado
        const certPaths = certificateAuth.generateUserCertificate(userId, userName);

        res.json({
            success: true,
            message: 'Certificado generado exitosamente',
            data: {
                userId,
                userName,
                certificatePath: certPaths.clientCertPath,
                keyPath: certPaths.clientKeyPath
            }
        });

    } catch (error) {
        console.error('Error generando certificado:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando certificado',
            error: error.message
        });
    }
});

// Revocar certificado de usuario (solo admin)
router.delete('/revoke/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar si el usuario tiene certificado
        if (!certificateAuth.hasValidCertificate(userId)) {
            return res.status(404).json({
                success: false,
                message: 'El usuario no tiene un certificado válido'
            });
        }

        // Revocar certificado
        certificateAuth.revokeUserCertificate(userId);

        res.json({
            success: true,
            message: 'Certificado revocado exitosamente'
        });

    } catch (error) {
        console.error('Error revocando certificado:', error);
        res.status(500).json({
            success: false,
            message: 'Error revocando certificado',
            error: error.message
        });
    }
});

// Obtener certificado de usuario (solo el propio usuario o admin)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;

        // Verificar permisos
        if (requestingUserId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a este certificado'
            });
        }

        // Verificar si el usuario tiene certificado
        if (!certificateAuth.hasValidCertificate(userId)) {
            return res.status(404).json({
                success: false,
                message: 'El usuario no tiene un certificado válido'
            });
        }

        // Obtener certificado
        const certificate = certificateAuth.getUserCertificate(userId);

        res.json({
            success: true,
            data: {
                userId,
                certificate: certificate.cert,
                key: certificate.key
            }
        });

    } catch (error) {
        console.error('Error obteniendo certificado:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo certificado',
            error: error.message
        });
    }
});

// Verificar estado del certificado del usuario actual
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const hasCert = certificateAuth.hasValidCertificate(userId);

        res.json({
            success: true,
            data: {
                userId,
                hasCertificate: hasCert
            }
        });

    } catch (error) {
        console.error('Error verificando estado del certificado:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando estado del certificado',
            error: error.message
        });
    }
});

// Listar todos los certificados (solo admin)
router.get('/list', adminAuth, async (req, res) => {
    try {
        // Esta funcionalidad requeriría implementar un método para listar certificados
        // Por ahora retornamos un mensaje informativo
        res.json({
            success: true,
            message: 'Funcionalidad de listado de certificados en desarrollo',
            data: []
        });

    } catch (error) {
        console.error('Error listando certificados:', error);
        res.status(500).json({
            success: false,
            message: 'Error listando certificados',
            error: error.message
        });
    }
});

// Descargar certificado CA (para instalación en clientes)
router.get('/ca-certificate', async (req, res) => {
    try {
        const CertificateManager = require('../config/certificates');
        const certManager = new CertificateManager();
        const paths = certManager.getCertificatePaths();

        res.download(paths.caCert, 'ca-certificate.pem', (err) => {
            if (err) {
                console.error('Error descargando certificado CA:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error descargando certificado CA'
                });
            }
        });

    } catch (error) {
        console.error('Error obteniendo certificado CA:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo certificado CA',
            error: error.message
        });
    }
});

module.exports = router; 