const { processReminders } = require('../controllers/signatureRequestController');

// Función para iniciar el scheduler de recordatorios
const startReminderScheduler = () => {
    // Procesar recordatorios cada 5 minutos
    setInterval(async () => {
        try {
            await processReminders();
        } catch (error) {
            console.error('Error en el scheduler de recordatorios:', error);
        }
    }, 5 * 60 * 1000); // 5 minutos

    console.log('Scheduler de recordatorios iniciado');
};

module.exports = { startReminderScheduler }; 