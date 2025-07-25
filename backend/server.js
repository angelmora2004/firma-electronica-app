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

// Mapea userId a socketId
const userSockets = new Map();

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
  });
  socket.on('disconnect', () => {
    for (const [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', fileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/ca', caRoutes);

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
server.listen(process.env.PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  await initDb();
}); 