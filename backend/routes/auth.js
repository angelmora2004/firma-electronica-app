const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verificar que JWT_SECRET esté definido
if (!process.env.JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET no está definida');
}

// Verificar que JWT_EXPIRES_IN esté definido
if (!process.env.JWT_EXPIRES_IN) {
    throw new Error('La variable de entorno JWT_EXPIRES_IN no está definida');
}

// Función de validación de email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Función de validación de contraseña
const isValidPassword = (password) => {
    return password.length >= 6;
};

// Middleware de autenticación
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ where: { id: decoded.id } });
        
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        res.status(401).json({ error: 'Por favor autentíquese.' });
    }
};

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user || !(await user.validatePassword(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                iat: Math.floor(Date.now() / 1000)
            }, 
            process.env.JWT_SECRET, 
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        res.json({ 
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email
            }, 
            token 
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Registro
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Verificar si el email ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const user = await User.create({ nombre, email, password });
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                iat: Math.floor(Date.now() / 1000)
            }, 
            process.env.JWT_SECRET, 
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        res.status(201).json({ 
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email
            }, 
            token 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(400).json({ error: error.message });
    }
});

// Obtener usuario actual
router.get('/me', auth, async (req, res) => {
    res.json({
        id: req.user.id,
        nombre: req.user.nombre,
        email: req.user.email
    });
});

// Actualizar perfil (contraseña)
router.put('/profile', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        // Validar contraseña actual
        if (!(await req.user.validatePassword(currentPassword))) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }

        // Actualizar contraseña
        req.user.password = newPassword;
        await req.user.save();

        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        res.status(500).json({ error: 'Error al actualizar contraseña' });
    }
});

// Eliminar cuenta
router.delete('/me', auth, async (req, res) => {
    try {
        await req.user.destroy();
        res.json({ message: 'Cuenta eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        res.status(500).json({ error: 'Error al eliminar cuenta' });
    }
});

module.exports = router; 