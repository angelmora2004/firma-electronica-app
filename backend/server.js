const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
require('dotenv').config();
const initDb = require('./config/init-db');
require('./utils/cleanup'); // Iniciar limpieza automática de archivos temporales
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Configuración para confiar en cabeceras de proxy (como se muestra en las diapositivas)
app.set('trust proxy', true);

// Middleware para redirigir HTTP a HTTPS (solo en producción)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.redirect('https://' + req.headers.host + req.url);
  });
}

// Crear servidor HTTP
const server = http.createServer(app);

// Configuración de Socket.IO para HTTP
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
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
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuración de CORS para HTTPS
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (como aplicaciones móviles, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173',
            'https://localhost:5173',
            'http://127.0.0.1:5173',
            'https://127.0.0.1:5173',
            'http://localhost:3000',
            'https://localhost:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        console.log('🔍 Origen de la petición:', origin);
        console.log('🔍 Orígenes permitidos:', allowedOrigins);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ Origen permitido:', origin);
            callback(null, true);
        } else {
            console.log('❌ Origen bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200,
    preflightContinue: false
}));

// Middleware para manejar OPTIONS requests
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log('🔍 OPTIONS request recibido para:', req.url);
        console.log('🔍 Headers de la petición:', req.headers);
        
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 horas
        
        res.status(200).end();
        return;
    }
    next();
});

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
const certificateRoutes = require('./routes/certificateRoutes');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', fileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/ca', caRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/signature-requests', signatureRequestRoutes);
app.use('/api/unsigned-documents', unsignedDocumentRoutes);
app.use('/api/signed-documents', signedDocumentRoutes);

// Endpoint de prueba para verificar que HTTPS funciona
app.get('/api/test-https', (req, res) => {
    console.log('🔍 Test HTTPS endpoint llamado');
    console.log('Headers:', req.headers);
    res.json({ 
        message: 'HTTPS funcionando correctamente',
        timestamp: new Date().toISOString(),
        protocol: req.protocol,
        secure: req.secure,
        headers: req.headers
    });
});

// Endpoint de prueba para CORS
app.options('/api/auth/login', (req, res) => {
    console.log('🔍 OPTIONS request recibido para /api/auth/login');
    console.log('Origin:', req.headers.origin);
    res.status(200).end();
});

app.post('/api/auth/login', (req, res, next) => {
    console.log('🔍 POST request recibido para /api/auth/login');
    console.log('Origin:', req.headers.origin);
    console.log('Headers:', req.headers);
    next();
});

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

const PORT = process.env.PORT || 3001;
const { startReminderScheduler } = require('./utils/reminderScheduler');
const { runCleanup } = require('./utils/cleanupUnsignedDocuments');

// Función para crear servidor HTTPS con certificados TLS
function createHttpsServer() {
    try {
        const CertificateManager = require('./config/certificates');
        const certManager = new CertificateManager();
        const paths = certManager.getCertificatePaths();

        // Verificar si existen los certificados
        if (!fs.existsSync(paths.serverCert) || !fs.existsSync(paths.serverKey)) {
            console.log('⚠️  Certificados TLS no encontrados. Ejecutando en modo HTTP...');
            return null;
        }

        const httpsOptions = {
            cert: fs.readFileSync(paths.serverCert),
            key: fs.readFileSync(paths.serverKey),
            ca: fs.readFileSync(paths.caCert),
            requestCert: false, // Cambiar a false para desarrollo
            rejectUnauthorized: false, // Permitir conexiones sin certificado para desarrollo
            // Configuración adicional para certificados autofirmados
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3'
        };

        const httpsServer = https.createServer(httpsOptions, app);
        
        // Configuración de Socket.IO para HTTPS
        const httpsIo = new Server(httpsServer, {
            cors: {
                origin: [
                    'http://localhost:5173',
                    'https://localhost:5173',
                    process.env.FRONTEND_URL
                ].filter(Boolean),
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Manejar conexiones Socket.IO en HTTPS
        httpsIo.on('connection', (socket) => {
            socket.on('register', (userId) => {
                if (!userSockets.has(userId)) {
                    userSockets.set(userId, new Set());
                }
                userSockets.get(userId).add(socket.id);
                console.log(`[HTTPS] Usuario ${userId} registrado con socket ${socket.id}`);
            });
            
            socket.on('disconnect', () => {
                for (const [userId, socketIds] of userSockets.entries()) {
                    if (socketIds.has(socket.id)) {
                        socketIds.delete(socket.id);
                        if (socketIds.size === 0) {
                            userSockets.delete(userId);
                        }
                        console.log(`[HTTPS] Socket ${socket.id} desconectado del usuario ${userId}`);
                        break;
                    }
                }
            });
        });

        // Exportar para uso en otros módulos
        module.exports.httpsIo = httpsIo;

        return httpsServer;
    } catch (error) {
        console.log('⚠️  Error configurando HTTPS:', error.message);
        console.log('   Ejecutando en modo HTTP...');
        return null;
    }
}

// Crear servidor HTTPS si es posible
const httpsServer = createHttpsServer();

server.listen(PORT, async () => {
  console.log(`🚀 Servidor HTTP corriendo en el puerto ${PORT}`);
  await initDb();
  
  // Iniciar servidor HTTPS si está disponible
  if (httpsServer) {
    const httpsPort = process.env.HTTPS_PORT || 3443;
    httpsServer.listen(httpsPort, () => {
      console.log(`🔒 Servidor HTTPS corriendo en el puerto ${httpsPort}`);
    });
  }
  
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