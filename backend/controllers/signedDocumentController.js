const SignedDocument = require('../models/SignedDocument');
const { decrypt } = require('../utils/crypto');

// Listar documentos firmados del usuario
exports.getSignedDocuments = async (req, res) => {
    try {
        const docs = await SignedDocument.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'fileName', 'createdAt']
        });
        res.status(200).json(docs);
    } catch (error) {
        console.error('Error al listar documentos firmados:', error);
        res.status(500).json({ message: 'Error al obtener documentos firmados.' });
    }
};

// Descargar documento firmado desencriptado
exports.downloadSignedDocument = async (req, res) => {
    const { id } = req.params;
    const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
    if (!masterKey) {
        return res.status(500).json({ message: 'No se ha definido SIGNED_DOC_MASTER_KEY en el entorno.' });
    }
    try {
        const doc = await SignedDocument.findOne({ where: { id, userId: req.user.id } });
        if (!doc) return res.status(404).json({ message: 'Documento no encontrado.' });
        // 1. Desencriptar la clave del documento
        const docKey = await decrypt(doc.encryptedKey, masterKey, doc.keyIv, doc.keySalt, doc.keyAuthTag);
        // 2. Desencriptar el PDF
        const pdfBuffer = await decrypt(doc.encryptedData, docKey, doc.iv, doc.salt, doc.authTag);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error al descargar documento firmado:', error);
        res.status(500).json({ message: 'Error al descargar el documento.' });
    }
};

// Eliminar documento firmado
exports.deleteSignedDocument = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await SignedDocument.destroy({ where: { id, userId: req.user.id } });
        if (!deleted) return res.status(404).json({ message: 'Documento no encontrado.' });
        res.status(200).json({ message: 'Documento eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar documento firmado:', error);
        res.status(500).json({ message: 'Error al eliminar el documento.' });
    }
}; 