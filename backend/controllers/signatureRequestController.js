const SignatureRequest = require('../models/SignatureRequest');
const UnsignedDocument = require('../models/UnsignedDocument');
const SignedDocument = require('../models/SignedDocument');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const { io, userSockets } = require('../server');
const { decrypt } = require('../utils/crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Enviar solicitud de firma (un solo destinatario)
exports.sendSignatureRequest = async (req, res) => {
    try {
        const { documentId, documentType, recipientEmail, message, expiresAt } = req.body;
        const senderId = req.user.id;

        console.log('Enviando solicitud de firma:', { documentId, documentType, recipientEmail, message, expiresAt });

        // Validar que hay un destinatario
        if (!recipientEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debe especificar un destinatario' 
            });
        }

        // Validar que el documento existe y pertenece al remitente
        let document;
        if (documentType === 'signed') {
            document = await SignedDocument.findOne({ 
                where: { id: documentId, userId: senderId } 
            });
        } else {
            document = await UnsignedDocument.findOne({ 
                where: { id: documentId, userId: senderId } 
            });
        }

        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento no encontrado o no tienes permisos' 
            });
        }

        // Buscar el usuario destinatario
        const recipient = await User.findOne({ where: { email: recipientEmail } });
        if (!recipient) {
            return res.status(404).json({ 
                success: false, 
                message: `El destinatario ${recipientEmail} no existe en el sistema` 
            });
        }

        // Validar que no se envíe a sí mismo
        if (senderId === recipient.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'No puedes enviar una solicitud de firma a ti mismo' 
            });
        }

        console.log(`Enviando solicitud a ${recipient.email}`);
        
        // Crear la solicitud de firma
        const signatureRequest = await SignatureRequest.create({
            documentId,
            documentType,
            senderId,
            recipientId: recipient.id,
            message,
            expiresAt: new Date(expiresAt)
        });

        // Obtener el nombre del remitente
        const sender = await User.findByPk(req.user.id);
        const senderName = sender ? sender.nombre : 'Usuario';
        
        // Crear notificación para el destinatario
        const notification = await Notification.create({
            userId: recipient.id,
            mensaje: `${senderName} te ha enviado un documento para firmar`,
            tipo: 'aprobada',
            leido: false
        });

        // Enviar notificación en tiempo real
        const socketIds = userSockets.get(recipient.id);
        if (socketIds && socketIds.size > 0) {
            socketIds.forEach(socketId => {
                io.to(socketId).emit('nuevaNotificacion', notification);
            });
            console.log(`Notificación enviada a ${socketIds.size} sockets del usuario ${recipient.id}`);
        }

        // Crear recordatorios automáticos
        await createReminders(signatureRequest.id, recipient.id, expiresAt);

        res.status(201).json({
            success: true,
            message: 'Solicitud de firma enviada correctamente',
            data: signatureRequest
        });

    } catch (error) {
        console.error('Error al enviar solicitud de firma:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al enviar la solicitud de firma' 
        });
    }
};

// Obtener solicitudes recibidas
exports.getReceivedRequests = async (req, res) => {
    try {
        const requests = await SignatureRequest.findAll({
            where: { 
                recipientId: req.user.id,
                status: 'pendiente'
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'nombre', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('Error al obtener solicitudes recibidas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las solicitudes' 
        });
    }
};

// Obtener solicitudes enviadas
exports.getSentRequests = async (req, res) => {
    try {
        // Obtener todas las solicitudes enviadas por el usuario
        const requests = await SignatureRequest.findAll({
            where: { senderId: req.user.id },
            include: [
                {
                    model: User,
                    as: 'recipient',
                    attributes: ['id', 'nombre', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calcular estado para cada solicitud
        const requestsWithStatus = requests.map(request => {
            const isExpired = new Date(request.expiresAt) < new Date();
            
            let status = request.status;
            if (request.status === 'pendiente' && isExpired) {
                status = 'expirado';
            }
            
            return {
                ...request.toJSON(),
                status,
                allSigned: request.status === 'firmado'
            };
        });

        res.status(200).json({
            success: true,
            data: requestsWithStatus
        });

    } catch (error) {
        console.error('Error al obtener solicitudes enviadas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las solicitudes' 
        });
    }
};

// Obtener documento para firma
exports.getDocumentForSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const { Op } = require('sequelize');
        const request = await SignatureRequest.findOne({
            where: { 
                id,
                [Op.or]: [
                    { recipientId: req.user.id },
                    { senderId: req.user.id }
                ]
            }
        });

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o no tienes permisos' 
            });
        }

        // Solo verificar expiración si el usuario es el destinatario
        if (request.recipientId === req.user.id && new Date() > new Date(request.expiresAt)) {
            request.status = 'expirado';
            await request.save();
            return res.status(400).json({ 
                success: false, 
                message: 'La solicitud de firma ha expirado' 
            });
        }

        let document;
        
        if (request.documentType === 'signed') {
            document = await SignedDocument.findByPk(request.documentId);
        } else {
            document = await UnsignedDocument.findByPk(request.documentId);
        }

        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento no encontrado' 
            });
        }

        // Obtener el documento base (original o con firmas anteriores)
        let documentData;
        console.log('Document type:', request.documentType);
        console.log('Document has encryptedData:', !!document.encryptedData);
        console.log('Document has originalData:', !!document.originalData);
        


        if (document.encryptedData) {
            // Si el documento tiene datos encriptados, desencriptar
            console.log('Desencriptando documento...');
            const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
            if (!masterKey) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error de configuración: MASTER_KEY no definida' 
                });
            }
            
            try {
                // Desencriptar la clave del documento
                const docKey = await decrypt(document.encryptedKey, masterKey, document.keyIv, document.keySalt, document.keyAuthTag);
                // Desencriptar el PDF
                documentData = await decrypt(document.encryptedData, docKey, document.iv, document.salt, document.authTag);
                console.log('Documento desencriptado exitosamente, tamaño:', documentData.length);
            } catch (error) {
                console.error('Error desencriptando documento:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al desencriptar el documento' 
                });
            }
        } else {
            // Para documentos sin encriptar, usar los datos originales
            console.log('Usando datos originales del documento');
            documentData = document.originalData;
        }



        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        res.send(documentData);

    } catch (error) {
        console.error('Error al obtener documento para firma:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el documento' 
        });
    }
};

// Firmar documento (integrado con microservicio)
exports.signDocument = [upload.single('pdf'), async (req, res) => {
    try {
        const { id } = req.params;
        const { signatureId, password } = req.body;

        if (!signatureId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren signatureId y password'
            });
        }

        const request = await SignatureRequest.findOne({
            where: { 
                id,
                recipientId: req.user.id,
                status: 'pendiente'
            }
        });

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o ya procesada' 
            });
        }

        // Verificar si la solicitud ha expirado
        if (new Date() > new Date(request.expiresAt)) {
            request.status = 'expirado';
            await request.save();
            return res.status(400).json({ 
                success: false, 
                message: 'La solicitud de firma ha expirado' 
            });
        }

        // Obtener la firma del usuario
        const Signature = require('../models/Signature');
        const signature = await Signature.findOne({
            where: { id: signatureId, userId: req.user.id }
        });

        if (!signature) {
            return res.status(404).json({ 
                success: false, 
                message: 'Firma no encontrada' 
            });
        }

        // Desbloquear la firma
        const { decrypt } = require('../utils/crypto');
        const signatureBuffer = await decrypt(
            signature.encryptedData, 
            password, 
            signature.iv, 
            signature.salt, 
            signature.authTag
        );

        // Obtener el PDF que el frontend envió (con estampa visual)
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se recibió el archivo PDF' 
            });
        }

        if (!req.file.buffer) {
            return res.status(400).json({ 
                success: false, 
                message: 'El archivo PDF no tiene buffer válido' 
            });
        }

        // Preparar archivos para el microservicio
        const tempDir = path.join(__dirname, '../uploads/temp_sign');
        const tempPdfPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
        const tempP12Path = path.join(tempDir, `temp_${Date.now()}.p12`);
        
        // Asegurar que el directorio temporal existe
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        // Usar el PDF que el frontend envió (con estampa visual)
        console.log('Escribiendo PDF con buffer de tamaño:', req.file.buffer.length);
        await fs.promises.writeFile(tempPdfPath, req.file.buffer);
        await fs.promises.writeFile(tempP12Path, signatureBuffer);

        // Enviar al microservicio para firmar
        const form = new FormData();
        form.append('pdf', fs.createReadStream(tempPdfPath), { filename: 'document.pdf' });
        form.append('p12', fs.createReadStream(tempP12Path), { filename: 'cert.p12' });
        form.append('password', password);

        const pyhankoUrl = process.env.PYHANKO_URL || 'http://localhost:5001'; // Usar PyHanko
        const response = await axios.post(`${pyhankoUrl}/sign-pdf`, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        // Limpiar archivos temporales
        await fs.promises.unlink(tempPdfPath);
        await fs.promises.unlink(tempP12Path);

        const signedPdfBuffer = Buffer.from(response.data);

        // Guardar documento firmado en la base de datos
        const crypto = require('crypto');
        const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
        if (!masterKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error de configuración del servidor' 
            });
        }

        // Encriptar el documento firmado
        const docKey = crypto.randomBytes(32);
        const { encryptedData, iv, salt, authTag } = await require('../utils/crypto').encrypt(signedPdfBuffer, docKey);
        const { encryptedData: encryptedKey, iv: keyIv, salt: keySalt, authTag: keyAuthTag } = await require('../utils/crypto').encrypt(docKey, masterKey);

        const signedDocument = await SignedDocument.create({
            fileName: `documento_firmado_${Date.now()}.pdf`,
            encryptedData,
            encryptedKey,
            iv,
            salt,
            authTag,
            keyIv,
            keySalt,
            keyAuthTag,
            userId: req.user.id
        });

        // Actualizar la solicitud
        request.status = 'firmado';
        request.signedAt = new Date();
        request.signedDocumentId = signedDocument.id;
        await request.save();

        // Verificar si todos los firmantes han firmado
        const allRequests = await SignatureRequest.findAll({
            where: { 
                documentId: request.documentId,
                documentType: request.documentType,
                senderId: request.senderId
            }
        });

        const allSigned = allRequests.every(req => req.status === 'firmado');
        
        if (allSigned) {
            // Notificar al remitente que todos han firmado
            await Notification.create({
                userId: request.senderId,
                mensaje: `✅ Todos los firmantes han completado la firma del documento. Puedes descargarlo desde "Documentos Firmados".`,
                tipo: 'aprobada',
                leido: false
            });

            const socketIds = userSockets.get(request.senderId);
            if (socketIds && socketIds.size > 0) {
                const notificationData = {
                    mensaje: `✅ Todos los firmantes han completado la firma del documento. Puedes descargarlo desde "Documentos Firmados".`,
                    tipo: 'aprobada',
                    createdAt: new Date()
                };
                
                socketIds.forEach(socketId => {
                    io.to(socketId).emit('nuevaNotificacion', notificationData);
                });
            }
        } else {
            // Obtener el nombre del usuario desde la base de datos
            const user = await User.findByPk(req.user.id);
            const userName = user ? user.nombre : 'Usuario';
            
            // Notificar al remitente que alguien firmó
            await Notification.create({
                userId: request.senderId,
                mensaje: `📝 ${userName} ha firmado el documento (${request.signatureOrder}/${request.totalSigners})`,
                tipo: 'aprobada',
                leido: false
            });

            const socketIds = userSockets.get(request.senderId);
            if (socketIds && socketIds.size > 0) {
                const notificationData = {
                    mensaje: `📝 ${userName} ha firmado el documento (${request.signatureOrder}/${request.totalSigners})`,
                    tipo: 'aprobada',
                    createdAt: new Date()
                };
                
                socketIds.forEach(socketId => {
                    io.to(socketId).emit('nuevaNotificacion', notificationData);
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Documento firmado correctamente',
            data: {
                signedDocumentId: signedDocument.id,
                allSigned: allSigned,
                signedCount: allRequests.filter(r => r.status === 'firmado').length,
                totalSigners: allRequests.length
            }
        });

    } catch (error) {
        console.error('Error al firmar documento:', error);
        
        // Limpiar archivos temporales en caso de error
        if (req.file && req.file.path) {
            try { await fs.promises.unlink(req.file.path); } catch {}
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al firmar el documento' 
        });
    }
}];

// Rechazar solicitud de firma
exports.rejectSignatureRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const request = await SignatureRequest.findOne({
            where: { 
                id,
                recipientId: req.user.id,
                status: 'pendiente'
            }
        });

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o ya procesada' 
            });
        }

        request.status = 'rechazado';
        request.rejectionReason = reason;
        await request.save();

        // Obtener el nombre del usuario desde la base de datos
        const user = await User.findByPk(req.user.id);
        const userName = user ? user.nombre : 'Usuario';
        
        // Crear notificación para el remitente
        await Notification.create({
            userId: request.senderId,
            mensaje: `${userName} ha rechazado firmar tu documento${reason ? ': ' + reason : ''}`,
            tipo: 'rechazada',
            leido: false
        });

        // Enviar notificación en tiempo real
        const socketIds = userSockets.get(request.senderId);
        if (socketIds && socketIds.size > 0) {
            const notificationData = {
                mensaje: `${userName} ha rechazado firmar tu documento${reason ? ': ' + reason : ''}`,
                tipo: 'rechazada',
                createdAt: new Date()
            };
            
            socketIds.forEach(socketId => {
                io.to(socketId).emit('nuevaNotificacion', notificationData);
            });
        }

        res.status(200).json({
            success: true,
            message: 'Solicitud rechazada correctamente'
        });

    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al rechazar la solicitud' 
        });
    }
};

// Eliminar solicitud de firma
exports.deleteSignatureRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await SignatureRequest.findOne({
            where: { 
                id,
                senderId: req.user.id,
                status: 'pendiente'
            }
        });

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o ya procesada' 
            });
        }

        await request.destroy();

        res.status(200).json({
            success: true,
            message: 'Solicitud eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar la solicitud' 
        });
    }
};

// Descargar documento firmado de una solicitud
exports.downloadSignedDocument = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Download request - ID:', id);
        console.log('User ID:', req.user.id);
        console.log('User ID type:', typeof req.user.id);
        
        // Validar que el user ID sea válido
        if (!req.user.id || typeof req.user.id !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de usuario inválido' 
            });
        }
        
        const { Op } = require('sequelize');
        
        // Buscar la solicitud por ID primero
        const request = await SignatureRequest.findByPk(id);
        
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada' 
            });
        }
        
        // Verificar que el usuario tiene permisos para acceder a esta solicitud
        if (request.recipientId !== req.user.id && request.senderId !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a esta solicitud' 
            });
        }
        
        // Verificar que el documento está firmado
        if (request.status !== 'firmado') {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento no firmado' 
            });
        }



        if (!request.signedDocumentId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento firmado no encontrado' 
            });
        }

        const signedDocument = await SignedDocument.findByPk(request.signedDocumentId);
        if (!signedDocument) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento firmado no encontrado' 
            });
        }

        // Descifrar el documento
        const { decrypt } = require('../utils/crypto');
        const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
        
        if (!masterKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error de configuración del servidor' 
            });
        }

        const docKey = await decrypt(
            signedDocument.encryptedKey, 
            masterKey, 
            signedDocument.keyIv, 
            signedDocument.keySalt, 
            signedDocument.keyAuthTag
        );

        const decryptedData = await decrypt(
            signedDocument.encryptedData, 
            docKey, 
            signedDocument.iv, 
            signedDocument.salt, 
            signedDocument.authTag
        );

        // Configurar headers para la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${signedDocument.fileName}"`);
        res.setHeader('Content-Length', decryptedData.length);

        // Enviar el archivo descifrado
        res.send(decryptedData);

    } catch (error) {
        console.error('Error descargando documento firmado:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al descargar el documento' 
        });
    }
};

// Descargar documento firmado por documentId y documentType
exports.downloadSignedDocumentByDocument = async (req, res) => {
    try {
        const { documentId, documentType } = req.params;
        const { Op } = require('sequelize');

        console.log(`Download request - Document ID: ${documentId}, Type: ${documentType}`);
        console.log(`User ID: ${req.user.id}`);

        // Buscar la solicitud de firma que tenga el documento firmado
        const request = await SignatureRequest.findOne({
            where: {
                documentId: documentId,
                documentType: documentType,
                senderId: req.user.id,
                status: 'firmado'
            },
            order: [['createdAt', 'DESC']] // Tomar la más reciente
        });

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud de firma no encontrada o no tienes permisos' 
            });
        }

        if (!request.signedDocumentId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento firmado no encontrado' 
            });
        }

        const signedDocument = await SignedDocument.findByPk(request.signedDocumentId);
        if (!signedDocument) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento firmado no encontrado' 
            });
        }

        // Descifrar el documento
        const { decrypt } = require('../utils/crypto');
        const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
        
        if (!masterKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error de configuración del servidor' 
            });
        }

        const docKey = await decrypt(
            signedDocument.encryptedKey, 
            masterKey, 
            signedDocument.keyIv, 
            signedDocument.keySalt, 
            signedDocument.keyAuthTag
        );

        const decryptedData = await decrypt(
            signedDocument.encryptedData, 
            docKey, 
            signedDocument.iv, 
            signedDocument.salt, 
            signedDocument.authTag
        );

        // Configurar headers para la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${signedDocument.fileName}"`);
        res.setHeader('Content-Length', decryptedData.length);

        // Enviar el archivo descifrado
        res.send(decryptedData);

    } catch (error) {
        console.error('Error descargando documento firmado por documento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al descargar el documento' 
        });
    }
};

// Función para crear recordatorios automáticos
const createReminders = async (signatureRequestId, userId, expiresAt) => {
    try {
        const expirationDate = new Date(expiresAt);
        
        // Recordatorio 24 horas antes de la expiración
        const reminder24h = new Date(expirationDate.getTime() - 24 * 60 * 60 * 1000);
        if (reminder24h > new Date()) {
            await Reminder.create({
                signatureRequestId,
                userId,
                reminderType: 'expiration_warning',
                scheduledAt: reminder24h
            });
        }

        // Recordatorio 1 hora antes de la expiración
        const reminder1h = new Date(expirationDate.getTime() - 60 * 60 * 1000);
        if (reminder1h > new Date()) {
            await Reminder.create({
                signatureRequestId,
                userId,
                reminderType: 'expiration_warning',
                scheduledAt: reminder1h
            });
        }

        // Recordatorio de firma pendiente (3 días después del envío)
        const reminder3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await Reminder.create({
            signatureRequestId,
            userId,
            reminderType: 'pending_signature',
            scheduledAt: reminder3d
        });

    } catch (error) {
        console.error('Error creando recordatorios:', error);
    }
};

// Función para procesar recordatorios pendientes
exports.processReminders = async () => {
    try {
        const now = new Date();
        const pendingReminders = await Reminder.findAll({
            where: {
                sent: false,
                scheduledAt: {
                    [require('sequelize').Op.lte]: now
                }
            },
            include: [
                {
                    model: SignatureRequest,
                    include: [
                        { model: User, as: 'sender' },
                        { model: User, as: 'recipient' }
                    ]
                },
                { model: User }
            ]
        });

        for (const reminder of pendingReminders) {
            try {
                let message = '';
                if (reminder.reminderType === 'expiration_warning') {
                    message = `⚠️ Tu solicitud de firma expira pronto. Por favor, revisa y firma el documento enviado por ${reminder.SignatureRequest.sender.nombre}.`;
                } else if (reminder.reminderType === 'pending_signature') {
                    message = `📋 Tienes una solicitud de firma pendiente de ${reminder.SignatureRequest.sender.nombre}. Por favor, revisa tu bandeja de solicitudes.`;
                }

                // Crear notificación
                await Notification.create({
                    userId: reminder.userId,
                    mensaje: message,
                    tipo: 'aprobada',
                    leido: false
                });

                // Enviar notificación en tiempo real
                const socketIds = userSockets.get(reminder.userId);
                if (socketIds && socketIds.size > 0) {
                    const notificationData = {
                        mensaje: message,
                        tipo: 'aprobada',
                        createdAt: new Date()
                    };
                    
                    socketIds.forEach(socketId => {
                        io.to(socketId).emit('nuevaNotificacion', notificationData);
                    });
                }

                // Marcar recordatorio como enviado
                reminder.sent = true;
                reminder.sentAt = new Date();
                await reminder.save();

            } catch (error) {
                console.error('Error procesando recordatorio:', error);
            }
        }
    } catch (error) {
        console.error('Error procesando recordatorios:', error);
    }
}; 