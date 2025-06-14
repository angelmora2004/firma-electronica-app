const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT;

// Iniciar servidor HTTP
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 