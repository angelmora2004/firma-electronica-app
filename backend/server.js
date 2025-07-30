const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();
const initDb = require('./config/init-db');
require('./utils/cleanup'); // Iniciar limpieza automática de archivos temporales
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Cambia por tu frontend real en producción
    methods: ['GET', 'POST']
  }
});

// Mapea userId a múltiples socketIds
const userSockets = new Map(); // userId -> Set de socketIds

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log(`Usuario ${userId} registrado con socket ${socket.id}. Total sockets: ${userSockets.get(userId).size}`);
  });
  
  socket.on('disconnect', () => {
    for (const [userId, socketIds] of userSockets.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          userSockets.delete(userId);
        }
        console.log(`Socket ${socket.id} desconectado del usuario ${userId}. Sockets restantes: ${socketIds.size}`);
        break;
      }
    }
  });
});

// Exporta io y userSockets para usarlos en los endpoints
module.exports.io = io;
module.exports.userSockets = userSockets;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const fileRoutes = require('./routes/fileRoutes');
const usersRoutes = require('./routes/users');
const signatureRoutes = require('./routes/signatureRoutes');
const caRoutes = require('./routes/caRoutes');
const signatureRequestRoutes = require('./routes/signatureRequestRoutes');
const unsignedDocumentRoutes = require('./routes/unsignedDocumentRoutes');
const signedDocumentRoutes = require('./routes/signedDocumentRoutes');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', fileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/signature-requests', signatureRequestRoutes);
app.use('/api/unsigned-documents', unsignedDocumentRoutes);
app.use('/api/signed-documents', signedDocumentRoutes);

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor',
        error: err.message 
    });
});

const PORT = process.env.PORT;
const { startReminderScheduler } = require('./utils/reminderScheduler');
const { runCleanup } = require('./utils/cleanupUnsignedDocuments');

server.listen(process.env.PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  await initDb();
  
  // Iniciar scheduler de recordatorios
  startReminderScheduler();
  
  // Configurar limpieza automática de documentos sin firmar
  // Ejecutar limpieza automática cada 24 horas
  setInterval(async () => {
    try {
      await runCleanup();
    } catch (error) {
      console.error('Error en limpieza automática:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 horas

  // Ejecutar limpieza inicial al arrancar el servidor
  setTimeout(async () => {
    try {
      console.log('🧹 Ejecutando limpieza inicial de documentos sin firmar...');
      await runCleanup();
    } catch (error) {
      console.error('Error en limpieza inicial:', error);
    }
  }, 5000); // 5 segundos después de arrancar
}); 