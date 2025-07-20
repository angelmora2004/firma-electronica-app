const fs = require('fs/promises');
const path = require('path');
const Signature = require('../models/Signature');
const { encrypt, decrypt } = require('../utils/crypto');
const SignedDocument = require('../models/SignedDocument');
const QRCode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer({ dest: 'uploads/temp_sign/' });
require('dotenv').config();

exports.uploadSignature = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!req.body.password) {
        return res.status(400).json({ message: 'Password for the signature file is required.' });
    }

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

exports.signDocument = [upload.single('pdf'), async (req, res) => {
    const { signatureId, password, documentId, x, y, pageNumber } = req.body;
    // Validación básica
    if (!signatureId || !password || !documentId) {
        return res.status(400).json({ 
            message: 'Se requieren: signatureId, password y documentId.' 
        });
    }
    try {
        // 1. Obtener la firma del usuario
        const signature = await Signature.findOne({
            where: { id: signatureId, userId: req.user.id }
        });
        if (!signature) {
            return res.status(404).json({ message: 'Firma no encontrada.' });
        }
        // 2. Desbloquear la firma
        const signatureBuffer = await decrypt(
            signature.encryptedData, 
            password, 
            signature.iv, 
            signature.salt, 
            signature.authTag
        );
        // 3. Extraer información del certificado .p12
        const certificateInfo = await extractCertificateInfo(signatureBuffer, password);
        const currentDate = new Date().toISOString();
        const user = req.user;
        // 4. Leer el PDF subido
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió el archivo PDF.' });
        }
        const pdfBuffer = await fs.readFile(req.file.path);
        // 5. Guardar el PDF temporalmente para enviar al microservicio
        const tempPdfPath = req.file.path;
        const tempP12Path = path.join(__dirname, '../uploads/temp_sign', `temp_${Date.now()}.p12`);
        await fs.writeFile(tempP12Path, signatureBuffer);
        // 6. Enviar al microservicio para firmar
        const form = new FormData();
        form.append('pdf', pdfBuffer, { filename: 'document.pdf' });
        form.append('p12', await fs.readFile(tempP12Path), { filename: 'cert.p12' });
        form.append('password', password);
        // Puedes agregar más campos si el microservicio los requiere
        const pyhankoUrl = process.env.PYHANKO_URL;
        if (!pyhankoUrl) throw new Error('No está definida la variable de entorno PYHANKO_URL');
        const response = await axios.post(`${pyhankoUrl}/sign-pdf`, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });
        await fs.unlink(tempPdfPath);
        await fs.unlink(tempP12Path);
        const signedPdfBuffer = Buffer.from(response.data);

        // --- Guardar documento firmado en la base de datos encriptado ---
        const crypto = require('crypto');
        const masterKey = process.env.SIGNED_DOC_MASTER_KEY;
        if (!masterKey) {
            console.error('No se ha definido SIGNED_DOC_MASTER_KEY en el entorno.');
            return res.status(500).json({ message: 'No se ha definido SIGNED_DOC_MASTER_KEY en el entorno.' });
        }
        // 1. Generar clave aleatoria para el documento
        const docKey = crypto.randomBytes(32); // 256 bits
        // 2. Encriptar el PDF firmado con la clave del documento
        const { encryptedData, iv, salt, authTag } = await encrypt(signedPdfBuffer, docKey);
        // 3. Encriptar la clave del documento con la clave maestra
        const { encryptedData: encryptedKey, iv: keyIv, salt: keySalt, authTag: keyAuthTag } = await encrypt(docKey, masterKey);
        // 4. Guardar en la base de datos
        await SignedDocument.create({
            fileName: `documento_firmado_${Date.now()}.pdf`,
            encryptedData,
            encryptedKey,
            iv,
            salt,
            authTag,
            keyIv,
            keySalt,
            keyAuthTag,
            userId: req.user.id
        });
        // --- FIN NUEVO ---

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="documento_firmado_${Date.now()}.pdf"`);
        res.send(signedPdfBuffer);
        // Guardar en la base de datos si es necesario (puedes agregar la lógica aquí)
    } catch (error) {
        console.error('Error firmando documento:', error);
        if (error.message.includes('Unsupported state')) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al firmar el documento.' });
    }
}];

// Endpoint para extraer datos del certificado .p12 de una firma almacenada
exports.getCertInfo = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Se requiere la contraseña.' });
    }
    try {
        const signature = await Signature.findOne({ where: { id, userId: req.user.id } });
        if (!signature) {
            return res.status(404).json({ message: 'Firma no encontrada.' });
        }
        const signatureBuffer = await decrypt(
            signature.encryptedData,
            password,
            signature.iv,
            signature.salt,
            signature.authTag
        );
        const certInfo = await extractCertificateInfo(signatureBuffer, password);
        res.json(certInfo);
    } catch (error) {
        console.error('Error extrayendo info del certificado:', error);
        res.status(500).json({ message: 'Error extrayendo información del certificado.' });
    }
};

// Función para extraer información del certificado .p12
async function extractCertificateInfo(p12Buffer, password) {
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Guardar temporalmente el archivo .p12
        const tempP12Path = path.join(__dirname, '../uploads/temp_sign', `temp_${Date.now()}.p12`);
        const tempCertPath = tempP12Path + '.crt';
        
        await fs.promises.writeFile(tempP12Path, p12Buffer);
        
        // Extraer el certificado del .p12
        await new Promise((resolve, reject) => {
            const extract = spawn('openssl', [
                'pkcs12', '-in', tempP12Path, '-clcerts', '-nokeys', '-out', tempCertPath, '-passin', `pass:${password}`
            ]);
            let error = '';
            extract.stderr.on('data', (data) => { error += data.toString(); });
            extract.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempCertPath)) resolve();
                else reject(new Error('No se pudo extraer el certificado. ' + error));
            });
        });
        
        // Obtener información del certificado
        const certInfo = await new Promise((resolve, reject) => {
            const info = spawn('openssl', ['x509', '-in', tempCertPath, '-noout', '-text']);
            let output = '';
            let error = '';
            info.stdout.on('data', (data) => { output += data.toString(); });
            info.stderr.on('data', (data) => { error += data.toString(); });
            info.on('close', (code) => {
                if (code === 0) resolve(output);
                else reject(new Error('Error obteniendo información del certificado. ' + error));
            });
        });
        
        // Parsear la información del certificado
        const certificateInfo = {
            commonName: '',
            organization: '',
            organizationalUnit: '',
            country: '',
            state: '',
            locality: ''
        };
        
        // Extraer Common Name
        const cnMatch = certInfo.match(/Subject:.*CN\s*=\s*([^,\n]+)/i);
        if (cnMatch) certificateInfo.commonName = cnMatch[1].trim();
        
        // Extraer Organization
        const orgMatch = certInfo.match(/Subject:.*O\s*=\s*([^,\n]+)/i);
        if (orgMatch) certificateInfo.organization = orgMatch[1].trim();
        
        // Extraer Organizational Unit
        const ouMatch = certInfo.match(/Subject:.*OU\s*=\s*([^,\n]+)/i);
        if (ouMatch) certificateInfo.organizationalUnit = ouMatch[1].trim();
        
        // Extraer Country
        const countryMatch = certInfo.match(/Subject:.*C\s*=\s*([^,\n]+)/i);
        if (countryMatch) certificateInfo.country = countryMatch[1].trim();
        
        // Extraer State/Province
        const stateMatch = certInfo.match(/Subject:.*ST\s*=\s*([^,\n]+)/i);
        if (stateMatch) certificateInfo.state = stateMatch[1].trim();
        
        // Extraer Locality
        const localityMatch = certInfo.match(/Subject:.*L\s*=\s*([^,\n]+)/i);
        if (localityMatch) certificateInfo.locality = localityMatch[1].trim();
        
        // Limpiar archivos temporales
        try {
            await fs.promises.unlink(tempP12Path);
            await fs.promises.unlink(tempCertPath);
        } catch (cleanupError) {
            console.error('Error limpiando archivos temporales:', cleanupError);
        }
        
        return certificateInfo;
        
    } catch (error) {
        console.error('Error extrayendo información del certificado:', error);
        return {
            commonName: '',
            organization: 'Sin organización',
            organizationalUnit: '',
            country: '',
            state: '',
            locality: ''
        };
    }
} 