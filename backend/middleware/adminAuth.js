const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso solo para administradores' });
        }
        const admin = await Admin.findOne({ where: { id: decoded.id } });
        if (!admin) {
            return res.status(401).json({ error: 'Admin no encontrado' });
        }
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = adminAuth; 