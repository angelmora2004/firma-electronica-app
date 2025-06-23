const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Signature = sequelize.define('Signature', {
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
    }
});

module.exports = Signature; 