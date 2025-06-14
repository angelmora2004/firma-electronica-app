const sequelize = require('./database');
const User = require('../models/User');

async function initializeDatabase() {
    try {
        // Sincronizar modelos con la base de datos
        await sequelize.sync({ force: true });
        console.log('Base de datos sincronizada correctamente');
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
}

// Ejecutar la inicialización
initializeDatabase(); 