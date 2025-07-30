const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UnsignedDocument = sequelize.define('UnsignedDocument', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    originalData: {
        type: DataTypes.BLOB('long'), // PDF original sin encriptar
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID, // Usuario que subió el documento
        allowNull: false
    },
    isShared: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = UnsignedDocument; 