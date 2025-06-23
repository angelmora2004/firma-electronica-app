const fs = require('fs/promises');
const Signature = require('../models/Signature');
const { encrypt, decrypt } = require('../utils/crypto');

exports.uploadSignature = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!req.body.password) {
        return res.status(400).json({ message: 'Password for the signature file is required.' });
    }

    try {
        const fileBuffer = await fs.readFile(req.file.path);
        
        const { encryptedData, iv, salt, authTag } = await encrypt(fileBuffer, req.body.password);

        await Signature.create({
            fileName: req.file.originalname,
            encryptedData,
            iv,
            salt,
            authTag,
            userId: req.user.id
        });

        // Eliminar el archivo original después de cifrarlo y guardarlo
        await fs.unlink(req.file.path);

        res.status(201).json({ message: 'Signature uploaded and encrypted successfully.' });

    } catch (error) {
        console.error('Error uploading signature:', error);
        // Asegurarse de que el archivo se elimine si hay un error
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file after failed upload:', unlinkError);
            }
        }
        res.status(500).json({ message: 'Server error while uploading signature.' });
    }
};

exports.getSignatures = async (req, res) => {
    try {
        const signatures = await Signature.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'fileName', 'createdAt']
        });
        res.status(200).json(signatures);
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ message: 'Server error while fetching signatures.' });
    }
};

exports.unlockSignature = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }

    try {
        const signature = await Signature.findOne({
            where: { id, userId: req.user.id }
        });

        if (!signature) {
            return res.status(404).json({ message: 'Signature not found.' });
        }
        
        await decrypt(signature.encryptedData, password, signature.iv, signature.salt, signature.authTag);
        
        res.status(200).json({ message: 'Signature unlocked successfully.' });

    } catch (error) {
        
        console.error('Error unlocking signature:', error.message);
        if (error.message.includes('Unsupported state')) {
            return res.status(401).json({ message: 'Invalid password.' });
        }
        res.status(500).json({ message: 'Server error while unlocking signature.' });
    }
};

exports.downloadSignature = async (req, res) => {
    const { id } = req.params;
    const { password } = req.query;

    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }

    try {
        const signature = await Signature.findOne({
            where: { id, userId: req.user.id }
        });

        if (!signature) {
            return res.status(404).json({ message: 'Signature not found.' });
        }

        // Descifrar la firma
        const decryptedData = await decrypt(
            signature.encryptedData, 
            password, 
            signature.iv, 
            signature.salt, 
            signature.authTag
        );

        // Configurar headers para la descarga
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${signature.fileName}"`);
        res.setHeader('Content-Length', decryptedData.length);

        // Enviar el archivo descifrado
        res.send(decryptedData);

    } catch (error) {
        console.error('Error downloading signature:', error.message);
        if (error.message.includes('Unsupported state')) {
            return res.status(401).json({ message: 'Invalid password.' });
        }
        res.status(500).json({ message: 'Server error while downloading signature.' });
    }
}; 