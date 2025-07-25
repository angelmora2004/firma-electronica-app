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