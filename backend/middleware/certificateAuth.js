const CertificateManager = require('../config/certificates');

class CertificateAuthMiddleware {
    constructor() {
        this.certManager = new CertificateManager();
    }

    // Middleware para verificar certificado de cliente
    verifyClientCertificate() {
        return (req, res, next) => {
            try {
                // Verificar si hay certificado de cliente
                if (!req.socket.authorized) {
                    return res.status(401).json({
                        success: false,
                        message: 'Certificado de cliente requerido o inválido'
                    });
                }

                // Obtener información del certificado
                const cert = req.socket.getPeerCertificate();
                
                if (!cert || !cert.subject) {
                    return res.status(401).json({
                        success: false,
                        message: 'Información del certificado no disponible'
                    });
                }

                // Extraer información del certificado
                const clientInfo = this.extractClientInfo(cert);
                
                if (!clientInfo.userId) {
                    return res.status(401).json({
                        success: false,
                        message: 'Certificado no contiene información de usuario válida'
                    });
                }

                // Verificar si el certificado existe en nuestro sistema
                if (!this.certManager.clientCertificateExists(clientInfo.userId)) {
                    return res.status(401).json({
                        success: false,
                        message: 'Certificado de usuario no registrado en el sistema'
                    });
                }

                // Agregar información del cliente a la request
                req.clientCertificate = clientInfo;
                req.userId = clientInfo.userId;
                
                console.log(`🔐 Usuario autenticado por certificado: ${clientInfo.userName} (${clientInfo.userId})`);
                
                next();
                
            } catch (error) {
                console.error('Error en verificación de certificado:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error en verificación de certificado'
                });
            }
        };
    }

    // Extraer información del certificado
    extractClientInfo(cert) {
        const subject = cert.subject;
        const commonName = subject.CN || '';
        const uid = subject.UID || '';
        
        // Buscar UID en el Common Name si no está en el campo UID
        const uidMatch = commonName.match(/UID=([^\/]+)/);
        const userId = uid || (uidMatch ? uidMatch[1] : '');
        
        // Extraer nombre del usuario del Common Name
        const nameMatch = commonName.match(/^([^\/]+)/);
        const userName = nameMatch ? nameMatch[1] : commonName;
        
        return {
            userId,
            userName,
            commonName,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            serialNumber: cert.serialNumber
        };
    }

    // Middleware opcional para certificados (no bloquea si no hay certificado)
    optionalCertificateAuth() {
        return (req, res, next) => {
            try {
                if (req.socket.authorized) {
                    const cert = req.socket.getPeerCertificate();
                    if (cert && cert.subject) {
                        const clientInfo = this.extractClientInfo(cert);
                        if (clientInfo.userId && this.certManager.clientCertificateExists(clientInfo.userId)) {
                            req.clientCertificate = clientInfo;
                            req.userId = clientInfo.userId;
                            console.log(`🔐 Usuario autenticado por certificado: ${clientInfo.userName} (${clientInfo.userId})`);
                        }
                    }
                }
                next();
            } catch (error) {
                console.error('Error en verificación opcional de certificado:', error);
                next();
            }
        };
    }

    // Verificar si el usuario tiene certificado válido
    hasValidCertificate(userId) {
        return this.certManager.clientCertificateExists(userId);
    }

    // Generar certificado para un usuario
    generateUserCertificate(userId, userName) {
        try {
            return this.certManager.generateClientCertificate(userId, userName);
        } catch (error) {
            console.error('Error generando certificado de usuario:', error);
            throw error;
        }
    }

    // Revocar certificado de usuario
    revokeUserCertificate(userId) {
        try {
            this.certManager.revokeClientCertificate(userId);
            this.certManager.generateCRL(); // Regenerar CRL
            return true;
        } catch (error) {
            console.error('Error revocando certificado de usuario:', error);
            throw error;
        }
    }

    // Obtener certificado de usuario
    getUserCertificate(userId) {
        return this.certManager.getClientCertificate(userId);
    }
}

module.exports = new CertificateAuthMiddleware(); 