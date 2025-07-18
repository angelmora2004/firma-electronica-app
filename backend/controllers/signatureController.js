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

    const path = require('path');
    const { spawn } = require('child_process');
    const fsSync = require('fs');
    const caCertPath = path.join(__dirname, '../uploads/ca/ca.pem');
    const tempCertPath = req.file.path + '.crt';
    let verificationFailed = false;
    let verificationErrorMsg = '';

    try {
        // 1. Extraer el certificado del .p12
        await new Promise((resolve, reject) => {
            const extract = spawn('openssl', [
                'pkcs12', '-in', req.file.path, '-clcerts', '-nokeys', '-out', tempCertPath, '-passin', `pass:${req.body.password}`
            ]);
            let error = '';
            extract.stderr.on('data', (data) => { error += data.toString(); });
            extract.on('close', (code) => {
                if (code === 0 && fsSync.existsSync(tempCertPath)) resolve();
                else reject(new Error('No se pudo extraer el certificado del archivo .p12. ' + error));
            });
        });

        // 2. Verificar el certificado extraído contra la CA
        await new Promise((resolve, reject) => {
            const verify = spawn('openssl', [
                'verify', '-CAfile', caCertPath, tempCertPath
            ]);
            let output = '';
            let error = '';
            verify.stdout.on('data', (data) => { output += data.toString(); });
            verify.stderr.on('data', (data) => { error += data.toString(); });
            verify.on('close', (code) => {
                if (code === 0 && output.includes(': OK')) resolve();
                else reject(new Error('El archivo .p12 no fue emitido por la Autoridad Certificadora registrada. ' + error + output));
            });
        });

        // Si pasa la validación, continuar con el flujo normal
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

        // Eliminar el archivo original y el temporal después de cifrarlo y guardarlo
        await fs.unlink(req.file.path);
        if (fsSync.existsSync(tempCertPath)) await fs.unlink(tempCertPath);

        res.status(201).json({ message: 'Signature uploaded and encrypted successfully.' });

    } catch (error) {
        // Eliminar archivos temporales si hay error
        if (req.file && req.file.path) {
            try { await fs.unlink(req.file.path); } catch {}
        }
        if (fsSync.existsSync(tempCertPath)) {
            try { await fs.unlink(tempCertPath); } catch {}
        }
        // Unificar mensaje de error para cualquier fallo de validación/extracción
        return res.status(400).json({ message: 'El archivo .p12 no fue emitido por la Autoridad Certificadora registrada.' });
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