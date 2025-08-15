const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PasswordResetToken = require('../models/PasswordResetToken');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');

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

        // Buscar primero en usuarios normales
        let user = await User.findOne({ where: { email } });
        if (user && await user.validatePassword(password)) {
            if (!user.activo) {
                return res.status(401).json({ error: 'Usuario desactivado' });
            }
            if (!user.emailVerified) {
                return res.status(401).json({ error: 'Debes verificar tu correo antes de iniciar sesión.' });
            }
            const token = jwt.sign(
                { id: user.id, email: user.email, nombre: user.nombre, iat: Math.floor(Date.now() / 1000), role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            return res.json({
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email
                },
                token,
                role: 'user'
            });
        }

        // Si no es usuario, buscar en admins
        const admin = await Admin.findOne({ where: { email } });
        if (admin && await admin.validatePassword(password)) {
            const token = jwt.sign(
                { id: admin.id, email: admin.email, nombre: admin.nombre, iat: Math.floor(Date.now() / 1000), role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            return res.json({
                admin: {
                    id: admin.id,
                    nombre: admin.nombre,
                    email: admin.email
                },
                token,
                role: 'admin'
            });
        }

        // Si no es ninguno
        return res.status(401).json({ error: 'Credenciales inválidas' });
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

        // Enlace de verificación (usa HTTP en desarrollo, HTTPS en producción)
        let baseUrl;
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.APP_BASE_URL) {
                throw new Error('La variable de entorno APP_BASE_URL no está definida');
            }
            baseUrl = process.env.APP_BASE_URL;
        } else {
            // En desarrollo, usar HTTP en el puerto 3443
            baseUrl = 'https://localhost:3443';
        }
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        // Enviar el correo
        const html = `
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px 24px 24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <div style="text-align:center;">
              <img src="https://img.icons8.com/color/96/000000/checked--v2.png" alt="Firma Electrónica" style="width:64px;margin-bottom:16px;" />
              <h2 style="color:#00d4aa;margin-bottom:8px;">¡Bienvenido a Firma Electrónica!</h2>
            </div>
            <p style="color:#222;font-size:1.1rem;margin-bottom:24px;">
              Hola <b>${user.nombre}</b>,<br>
              Gracias por registrarte. Para activar tu cuenta, por favor haz clic en el siguiente botón:
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${verificationUrl}" style="background:#00d4aa;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:1.1rem;display:inline-block;">
                Verificar mi correo
              </a>
            </div>
            <p style="color:#888;font-size:0.95rem;text-align:center;">
              Si no creaste esta cuenta, puedes ignorar este mensaje.<br>
              <span style="color:#bbb;">Firma Electrónica &copy; ${new Date().getFullYear()}</span>
            </p>
          </div>
        `;
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@firmaelectronica.com',
            to: email,
            subject: 'Verifica tu correo electrónico',
            html
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
        // Enlace de verificación (usa HTTP en desarrollo, HTTPS en producción)
        let baseUrl;
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.APP_BASE_URL) {
                throw new Error('La variable de entorno APP_BASE_URL no está definida');
            }
            baseUrl = process.env.APP_BASE_URL;
        } else {
            // En desarrollo, usar HTTP en el puerto 3443
            baseUrl = 'https://localhost:3443';
        }
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
        const html = `
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px 24px 24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <div style="text-align:center;">
              <img src="https://img.icons8.com/color/96/000000/checked--v2.png" alt="Firma Electrónica" style="width:64px;margin-bottom:16px;" />
              <h2 style="color:#00d4aa;margin-bottom:8px;">¡Bienvenido a Firma Electrónica!</h2>
            </div>
            <p style="color:#222;font-size:1.1rem;margin-bottom:24px;">
              Hola <b>${user.nombre}</b>,<br>
              Gracias por registrarte. Para activar tu cuenta, por favor haz clic en el siguiente botón:
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${verificationUrl}" style="background:#00d4aa;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:1.1rem;display:inline-block;">
                Verificar mi correo
              </a>
            </div>
            <p style="color:#888;font-size:0.95rem;text-align:center;">
              Si no creaste esta cuenta, puedes ignorar este mensaje.<br>
              <span style="color:#bbb;">Firma Electrónica &copy; ${new Date().getFullYear()}</span>
            </p>
          </div>
        `;
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@firmaelectronica.com',
            to: email,
            subject: 'Verifica tu correo electrónico',
            html
        });
        res.json({ message: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.' });
    } catch (error) {
        console.error('Error reenviando correo de verificación:', error);
        res.status(500).json({ error: 'No se pudo reenviar el correo de verificación.' });
    }
});

// Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'El correo es requerido.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Por seguridad, responder igual aunque el usuario no exista
            return res.json({ message: 'Si el correo está registrado, recibirás un código de recuperación.' });
        }
        // Eliminar tokens previos
        await PasswordResetToken.destroy({ where: { userId: user.id } });
        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        await PasswordResetToken.create({
            userId: user.id,
            token: code,
            expiresAt
        });
        // Enviar correo con el código
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        const html = `
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px 24px 24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <div style="text-align:center;">
              <img src="https://img.icons8.com/color/96/000000/forgot-password.png" alt="Recuperar contraseña" style="width:64px;margin-bottom:16px;" />
              <h2 style="color:#00d4aa;margin-bottom:8px;">Recuperación de Contraseña</h2>
            </div>
            <p style="color:#222;font-size:1.1rem;margin-bottom:24px;">
              Hola <b>${user.nombre}</b>,<br>
              Tu código de recuperación es:
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <span style="background:#00d4aa;color:#fff;padding:14px 32px;border-radius:8px;font-weight:600;font-size:1.5rem;letter-spacing:4px;display:inline-block;">
                ${code}
              </span>
            </div>
            <p style="color:#888;font-size:0.95rem;text-align:center;">
              Este código es válido por 15 minutos.<br>
              Si no solicitaste este cambio, puedes ignorar este mensaje.<br>
              <span style="color:#bbb;">Firma Electrónica &copy; ${new Date().getFullYear()}</span>
            </p>
          </div>
        `;
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@firmaelectronica.com',
            to: email,
            subject: 'Código de recuperación de contraseña',
            html
        });
        return res.json({ message: 'Si el correo está registrado, recibirás un código de recuperación.' });
    } catch (error) {
        console.error('Error en recuperación de contraseña:', error);
        res.status(500).json({ error: 'No se pudo enviar el código de recuperación.' });
    }
});

// Verificar código de recuperación
router.post('/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Correo y código son requeridos.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        const tokenRecord = await PasswordResetToken.findOne({
            where: { userId: user.id, token: code }
        });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        return res.json({ message: 'Código válido.' });
    } catch (error) {
        console.error('Error verificando código de recuperación:', error);
        res.status(500).json({ error: 'No se pudo verificar el código.' });
    }
});

// Cambiar contraseña usando el código de recuperación
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Correo, código y nueva contraseña son requeridos.' });
    }
    // Validación de contraseña fuerte (igual que en el registro)
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/~`]).{6,}$/;
    if (!strongPassword.test(newPassword)) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un carácter especial.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        const tokenRecord = await PasswordResetToken.findOne({
            where: { userId: user.id, token: code }
        });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        // Actualizar contraseña
        user.password = newPassword;
        await user.save();
        // Eliminar el token usado
        await tokenRecord.destroy();
        return res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
    }
});

// Crear un admin (solo para uso desde Postman, no frontend)
router.post('/admin/create', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        const existing = await Admin.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'El email ya está registrado como admin' });
        }
        const admin = await Admin.create({ nombre, email, password });
        res.status(201).json({ message: 'Admin creado correctamente', admin: { id: admin.id, nombre: admin.nombre, email: admin.email } });
    } catch (error) {
        console.error('Error creando admin:', error);
        res.status(500).json({ error: 'Error al crear admin' });
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

// Obtener notificaciones del usuario autenticado
router.get('/notifications', auth, async (req, res) => {
    try {
        const { all } = req.query;
        const whereClause = { userId: req.user.id };
        
        // Si no se especifica 'all', solo devolver no leídas
        if (!all) {
            whereClause.leido = false;
        }
        
        const notifications = await Notification.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Marcar notificación como leída
router.put('/notifications/:id/read', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOne({
            where: { id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        notification.leido = true;
        await notification.save();

        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        res.status(500).json({ error: 'Error al marcar notificación como leída' });
    }
});

// Marcar todas las notificaciones como leídas
router.put('/notifications/read-all', auth, async (req, res) => {
    try {
        await Notification.update(
            { leido: true },
            { where: { userId: req.user.id, leido: false } }
        );

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
    }
});

// Eliminar notificación
router.delete('/notifications/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOne({
            where: { id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        await notification.destroy();

        res.json({ message: 'Notificación eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

module.exports = router; 