const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

        if (!user.emailVerified) {
            return res.status(401).json({ error: 'Debes verificar tu correo antes de iniciar sesión.' });
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

        // Generar token único de verificación
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 día
        await EmailVerificationToken.create({
            userId: user.id,
            token: verificationToken,
            expiresAt
        });

        // Configurar el transporter de nodemailer (ajusta con tus credenciales reales)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Enlace de verificación (solo usa la variable de entorno, no valores por defecto)
        if (!process.env.APP_BASE_URL) {
            throw new Error('La variable de entorno APP_BASE_URL no está definida');
        }
        const verificationUrl = `${process.env.APP_BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

        // Enviar el correo
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@firmaelectronica.com',
            to: email,
            subject: 'Verifica tu correo electrónico',
            html: `<p>Hola ${nombre},</p>
                   <p>Por favor verifica tu correo haciendo clic en el siguiente enlace:</p>
                   <a href="${verificationUrl}">${verificationUrl}</a>
                   <p>Si no creaste esta cuenta, ignora este correo.</p>`
        });

        res.status(201).json({ 
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email
            },
            message: 'Registro exitoso. Por favor revisa tu correo para verificar tu cuenta.'
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint para verificar el correo electrónico
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ error: 'Token de verificación faltante.' });
    }
    try {
        const record = await EmailVerificationToken.findOne({ where: { token } });
        if (!record) {
            return res.status(400).json({ error: 'Token inválido o ya utilizado.' });
        }
        if (record.expiresAt < new Date()) {
            await record.destroy();
            return res.status(400).json({ error: 'El token ha expirado. Solicita un nuevo registro.' });
        }
        // Marcar usuario como verificado
        const user = await User.findByPk(record.userId);
        if (!user) {
            await record.destroy();
            return res.status(400).json({ error: 'Usuario no encontrado.' });
        }
        user.emailVerified = true;
        await user.save();
        await record.destroy();
        return res.json({ message: '¡Correo verificado exitosamente! Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error verificando correo:', error);
        res.status(500).json({ error: 'Error interno al verificar el correo.' });
    }
});

// Reenviar correo de verificación
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'El correo es requerido.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        if (user.emailVerified) {
            return res.status(400).json({ error: 'El correo ya está verificado.' });
        }
        // Eliminar tokens previos
        await EmailVerificationToken.destroy({ where: { userId: user.id } });
        // Generar nuevo token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 día
        await EmailVerificationToken.create({
            userId: user.id,
            token: verificationToken,
            expiresAt
        });
        // Configurar el transporter de nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        if (!process.env.APP_BASE_URL) {
            throw new Error('La variable de entorno APP_BASE_URL no está definida');
        }
        const verificationUrl = `${process.env.APP_BASE_URL}/api/auth/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@firmaelectronica.com',
            to: email,
            subject: 'Verifica tu correo electrónico',
            html: `<p>Hola ${user.nombre},</p>
                   <p>Por favor verifica tu correo haciendo clic en el siguiente enlace:</p>
                   <a href="${verificationUrl}">${verificationUrl}</a>
                   <p>Si no creaste esta cuenta, ignora este correo.</p>`
        });
        res.json({ message: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.' });
    } catch (error) {
        console.error('Error reenviando correo de verificación:', error);
        res.status(500).json({ error: 'No se pudo reenviar el correo de verificación.' });
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