const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CertificateRequest = sequelize.define('CertificateRequest', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false
    },
    locality: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Permitir null para poder borrar la contraseña
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada'),
        defaultValue: 'pendiente',
        allowNull: false
    },
    adminComment: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = CertificateRequest;
// Ajuste para asegurar el nombre de la tabla
CertificateRequest.sync({ alter: true, tableName: 'certificaterequests' }); 