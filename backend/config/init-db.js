const sequelize = require('./database');
const User = require('../models/User');
const Signature = require('../models/Signature');
const CAKey = require('../models/CAKey');
const SignedDocument = require('../models/SignedDocument');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const CertificateRequest = require('../models/CertificateRequest');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const UnsignedDocument = require('../models/UnsignedDocument');
const SignatureRequest = require('../models/SignatureRequest');
const Reminder = require('../models/Reminder');

User.hasMany(Signature, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
Signature.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
// Relación para documentos firmados
User.hasMany(SignedDocument, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
SignedDocument.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
// Relación para tokens de verificación de email
User.hasMany(EmailVerificationToken, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
EmailVerificationToken.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
// Relación para tokens de recuperación de contraseña
User.hasMany(PasswordResetToken, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
PasswordResetToken.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
// Relación para solicitudes de certificados
User.hasMany(CertificateRequest, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
CertificateRequest.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
// Relación para notificaciones
User.hasMany(Notification, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
Notification.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

// Relación para documentos sin firmar
User.hasMany(UnsignedDocument, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});
UnsignedDocument.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

// Relaciones para solicitudes de firma
User.hasMany(SignatureRequest, { 
    as: 'sentRequests', 
    foreignKey: 'senderId' 
});
User.hasMany(SignatureRequest, { 
    as: 'receivedRequests', 
    foreignKey: 'recipientId' 
});
SignatureRequest.belongsTo(User, { 
    as: 'sender', 
    foreignKey: 'senderId' 
});
SignatureRequest.belongsTo(User, { 
    as: 'recipient', 
    foreignKey: 'recipientId' 
});

// Relaciones para recordatorios
User.hasMany(Reminder, { foreignKey: 'userId' });
Reminder.belongsTo(User, { foreignKey: 'userId' });
SignatureRequest.hasMany(Reminder, { foreignKey: 'signatureRequestId' });
Reminder.belongsTo(SignatureRequest, { foreignKey: 'signatureRequestId' });

const initDb = async () => {
    try {
        // Usar force: false para evitar recrear tablas
        await sequelize.sync({ force: false });
        console.log('Base de datos sincronizada correctamente.');
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
};

module.exports = initDb; 