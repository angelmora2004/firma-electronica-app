const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SignedDocument = sequelize.define('SignedDocument', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    encryptedData: {
        type: DataTypes.BLOB('long'),
        allowNull: false,
    },
    encryptedKey: {
        type: DataTypes.BLOB('long'), // Clave AES encriptada con la clave maestra
        allowNull: false,
    },
    keyIv: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    keySalt: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    keyAuthTag: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    iv: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    salt: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    authTag: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

module.exports = SignedDocument; 