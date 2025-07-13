const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CAKey = sequelize.define('CAKey', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    encryptedKey: {
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
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

module.exports = CAKey; 