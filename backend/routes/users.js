const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ where: { id: decoded.id } });
        
        if (!user) {
            throw new Error();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Por favor autentíquese.' });
    }
};

// Obtener todos los usuarios
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener un usuario específico
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar usuario
router.put('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Solo permitir actualizar si es el mismo usuario
        if (req.user.id !== user.id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const { nombre, email, password } = req.body;
        await user.update({ nombre, email, password });
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Eliminar usuario
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Solo permitir eliminar si es el mismo usuario
        if (req.user.id !== user.id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        await user.destroy();
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router; 