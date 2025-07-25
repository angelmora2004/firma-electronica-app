const express = require('express');
const router = express.Router();
const caController = require('../controllers/caController');
const adminAuth = require('../middleware/adminAuth');
const CertificateRequest = require('../models/CertificateRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { decrypt } = require('../utils/crypto');
const CAKey = require('../models/CAKey');
const { io, userSockets } = require('../server');

// Endpoint para crear la CA
router.post('/create', caController.createCA);
// Endpoint para generar clave privada y CSR de usuario
router.post('/user-csr', caController.createUserKeyAndCSR);
// Endpoint para firmar el CSR del usuario y emitir el certificado
router.post('/sign-user', caController.signUserCSR);
// Endpoint para exportar clave y certificado del usuario a .p12
router.post('/export-p12', caController.exportUserP12);
// Endpoint para verificar que el certificado del usuario fue emitido por la CA
router.post('/verify-cert', caController.verifyUserCert);
// Endpoint para obtener información del certificado de la CA
router.get('/info', caController.getCAInfo);
// Endpoint para que el admin vea todas las solicitudes de certificados
router.get('/admin/certificate-requests', adminAuth, async (req, res) => {
    try {
        const requests = await CertificateRequest.findAll({
            include: [{ model: User, attributes: ['nombre', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
});

// Endpoint para aprobar una solicitud de certificado
router.post('/admin/certificate-requests/:id/approve', adminAuth, caController.approveCertificateRequest);
// Endpoint para rechazar una solicitud de certificado
router.post('/admin/certificate-requests/:id/reject', adminAuth, async (req, res) => {
    try {
        const request = await CertificateRequest.findByPk(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        if (request.status !== 'pendiente') {
            return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        }
        const { comentario } = req.body;
        request.status = 'rechazada';
        request.adminComment = comentario || '';
        await request.save();
        // Eliminar carpeta y archivos del usuario
        const safeEmail = request.email.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeEmail);
        if (fs.existsSync(userDir)) {
            fs.rmSync(userDir, { recursive: true, force: true });
        }
        await Notification.create({
            userId: request.userId,
            mensaje: `Tu solicitud de certificado ha sido rechazada.${comentario ? ' Motivo: ' + comentario : ''}`,
            tipo: 'rechazada',
            leido: false,
            link: null
        });
        const socketId2 = userSockets.get(request.userId);
        if (socketId2) {
            io.to(socketId2).emit('nuevaNotificacion', {
                mensaje: `Tu solicitud de certificado ha sido rechazada.${comentario ? ' Motivo: ' + comentario : ''}`,
                tipo: 'rechazada',
                createdAt: new Date(),
            });
        }
        res.json({ message: 'Solicitud rechazada y notificación enviada.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para descargar el archivo .p12 de forma segura (POST)
router.post('/download-p12', caController.downloadUserP12);

module.exports = router; 