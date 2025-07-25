const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { encrypt, decrypt } = require('../utils/crypto');
const CAKey = require('../models/CAKey');
const CertificateRequest = require('../models/CertificateRequest');
require('dotenv').config();

// Carpeta donde se guardarán los archivos de la CA
const caDir = path.join(__dirname, '../uploads/ca');
if (!fs.existsSync(caDir)) {
    fs.mkdirSync(caDir, { recursive: true });
}

// Función para crear la CA (clave privada y certificado raíz)
exports.createCA = async (req, res) => {
    try {
        // Verificar si ya existe una CA en la base de datos
        const existing = await CAKey.findOne();
        if (existing) {
            return res.status(400).json({ success: false, message: 'La CA ya existe.' });
        }
        // Nombres de archivos
        const caKeyPath = path.join(caDir, 'ca.key');
        const caCertPath = path.join(caDir, 'ca.pem');
        // 1. Generar clave privada de la CA
        await new Promise((resolve, reject) => {
            const genKey = spawn('openssl', ['genrsa', '-out', caKeyPath, '4096']);
            genKey.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error generando clave privada de la CA.'));
            });
        });
        // 2. Generar certificado raíz de la CA (autofirmado)
        await new Promise((resolve, reject) => {
            const subj = '/C=EC/ST=Esmeraldas/L=Esmeraldas/O=PUCESE/OU=IT/CN=PUCESE';
            const genCert = spawn('openssl', [
                'req', '-x509', '-new', '-key', caKeyPath, '-sha256',
                '-days', '3650', '-out', caCertPath, '-subj', subj
            ]);
            genCert.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error generando certificado raíz de la CA.'));
            });
        });
        // Leer la clave privada y cifrarla
        const caKeyBuffer = fs.readFileSync(caKeyPath);
        const masterKey = process.env.MASTER_KEY;
        if (!masterKey) {
            return res.status(500).json({ success: false, message: 'No se ha definido MASTER_KEY en el entorno.' });
        }
        const { encryptedData, iv, salt, authTag } = await encrypt(caKeyBuffer, masterKey);
        // Guardar en la base de datos
        await CAKey.create({
            encryptedKey: encryptedData,
            iv,
            salt,
            authTag
        });
        // Eliminar la clave privada del sistema de archivos
        fs.unlinkSync(caKeyPath);
        return res.json({ success: true, message: 'CA creada y clave privada almacenada de forma segura.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Función para generar clave privada y CSR de usuario (ahora solo guarda la solicitud como pendiente)
exports.createUserKeyAndCSR = async (req, res) => {
    try {
        const { username, country, state, locality, email, password } = req.body;
        if (!username || !email || !country || !state || !locality || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
        }
        // Buscar usuario solo por email
        const User = require('../models/User');
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        // Crear carpeta del usuario usando el email sanitizado
        const safeEmail = email.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeEmail);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        const userKeyPath = path.join(userDir, 'user.key');
        const userCSRPath = path.join(userDir, 'user.csr');
        // 1. Generar clave privada
        await new Promise((resolve, reject) => {
            const genKey = spawn('openssl', ['genrsa', '-out', userKeyPath, '2048']);
            genKey.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error generando clave privada del usuario.'));
            });
        });
        // 2. Generar CSR con valores por defecto
        const subj = `/C=${country}/ST=${state}/L=${locality}/O=PUCESE/OU=IT/CN=${username}/emailAddress=${email}`;
        await new Promise((resolve, reject) => {
            const genCSR = spawn('openssl', [
                'req', '-new', '-key', userKeyPath, '-out', userCSRPath, '-subj', subj
            ]);
            genCSR.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error generando CSR del usuario.'));
            });
        });
        // Guardar la solicitud en estado pendiente
        await CertificateRequest.create({
            userId: user.id,
            country,
            state,
            locality,
            email,
            password, // texto plano
            status: 'pendiente'
        });
        return res.json({ success: true, message: 'Solicitud de certificado enviada. Un administrador la revisará.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Función para firmar el CSR del usuario y emitir el certificado
exports.signUserCSR = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Falta el nombre de usuario.' });
        }
        // Sanitizar nombre de usuario
        const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeUsername);
        const userCSRPath = path.join(userDir, 'user.csr');
        const userCertPath = path.join(userDir, 'user.pem');
        const caDir = path.join(__dirname, '../uploads/ca');
        const caKeyPath = path.join(caDir, 'ca.key');
        const caCertPath = path.join(caDir, 'ca.pem');
        const caSrlPath = path.join(caDir, 'ca.srl'); // archivo de serial temporal

        // Validar existencia de archivos necesarios (excepto ca.key)
        if (!fs.existsSync(userCSRPath) || !fs.existsSync(caCertPath)) {
            return res.status(400).json({ success: false, message: 'Faltan archivos requeridos (CSR o CA).' });
        }

        // No sobrescribir si ya existe
        if (fs.existsSync(userCertPath)) {
            return res.status(400).json({ success: false, message: 'El certificado del usuario ya existe.' });
        }

        // Recuperar y descifrar la clave privada de la CA desde la base de datos
        const caKeyRecord = await CAKey.findOne();
        if (!caKeyRecord) {
            return res.status(500).json({ success: false, message: 'No se encontró la clave privada de la CA en la base de datos.' });
        }
        const masterKey = process.env.MASTER_KEY;
        if (!masterKey) {
            return res.status(500).json({ success: false, message: 'No se ha definido MASTER_KEY en el entorno.' });
        }
        const caKeyBuffer = await decrypt(
            caKeyRecord.encryptedKey,
            masterKey,
            caKeyRecord.iv,
            caKeyRecord.salt,
            caKeyRecord.authTag
        );
        // Guardar la clave privada temporalmente en el sistema de archivos
        fs.writeFileSync(caKeyPath, caKeyBuffer);

        // Firmar el CSR con la CA
        await new Promise((resolve, reject) => {
            const sign = spawn('openssl', [
                'x509', '-req', '-in', userCSRPath,
                '-CA', caCertPath, '-CAkey', caKeyPath,
                '-CAcreateserial', '-CAserial', caSrlPath,
                '-out', userCertPath, '-days', '365', '-sha256'
            ]);
            sign.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error firmando el CSR del usuario.'));
            });
        });

        // Eliminar archivo de serial temporal si existe
        if (fs.existsSync(caSrlPath)) {
            fs.unlinkSync(caSrlPath);
        }
        // Eliminar la clave privada temporal
        if (fs.existsSync(caKeyPath)) {
            fs.unlinkSync(caKeyPath);
        }

        return res.json({ success: true, message: 'Certificado de usuario emitido correctamente.', userCert: `uploads/users/${safeUsername}/user.pem` });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Función para exportar clave y certificado del usuario a .p12
exports.exportUserP12 = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
        }
        // Sanitizar nombre de usuario
        const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeUsername);
        const userKeyPath = path.join(userDir, 'user.key');
        const userCertPath = path.join(userDir, 'user.pem');
        const userCSRPath = path.join(userDir, 'user.csr');
        const caDir = path.join(__dirname, '../uploads/ca');
        const caCertPath = path.join(caDir, 'ca.pem');
        const userP12Path = path.join(userDir, 'user.p12');

        // Validar existencia de archivos necesarios
        if (!fs.existsSync(userKeyPath) || !fs.existsSync(userCertPath) || !fs.existsSync(caCertPath)) {
            return res.status(400).json({ success: false, message: 'Faltan archivos requeridos (clave, certificado o CA).' });
        }

        // No sobrescribir si ya existe
        if (fs.existsSync(userP12Path)) {
            fs.unlinkSync(userP12Path); // Elimina el anterior si existe para evitar errores
        }

        // Exportar a .p12 usando openssl pkcs12
        await new Promise((resolve, reject) => {
            const args = [
                'pkcs12', '-export', '-out', userP12Path,
                '-inkey', userKeyPath, '-in', userCertPath,
                '-certfile', caCertPath, '-password', `pass:${password}`
            ];
            const exportP12 = spawn('openssl', args);
            exportP12.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error exportando a .p12.'));
            });
        });

        // Enviar el archivo .p12 como descarga directa
        res.download(userP12Path, `${safeUsername}.p12`, (err) => {
            // Eliminar archivos temporales después de enviar el .p12
            const tryDelete = (filePath) => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
            };
            tryDelete(userKeyPath);
            tryDelete(userCertPath);
            tryDelete(userCSRPath);
            tryDelete(userP12Path);
        });
    } catch (err) {
        // Intentar limpiar archivos temporales si ocurre un error
        try {
            const { username } = req.body;
            if (username) {
                const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
                const userDir = path.join(__dirname, '../uploads/users', safeUsername);
                ['user.key', 'user.pem', 'user.csr', 'user.p12'].forEach(f => {
                    const filePath = path.join(userDir, f);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }
        } catch {}
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Función para verificar que el certificado del usuario fue emitido por la CA
exports.verifyUserCert = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Falta el nombre de usuario.' });
        }
        // Sanitizar nombre de usuario
        const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeUsername);
        const userCertPath = path.join(userDir, 'user.pem');
        const caDir = path.join(__dirname, '../uploads/ca');
        const caCertPath = path.join(caDir, 'ca.pem');

        // Validar existencia de archivos necesarios
        if (!fs.existsSync(userCertPath) || !fs.existsSync(caCertPath)) {
            return res.status(400).json({ success: false, message: 'Faltan archivos requeridos (certificado de usuario o CA).' });
        }

        // Verificar el certificado
        await new Promise((resolve, reject) => {
            const verify = spawn('openssl', [
                'verify', '-CAfile', caCertPath, userCertPath
            ]);
            let output = '';
            let error = '';
            verify.stdout.on('data', (data) => { output += data.toString(); });
            verify.stderr.on('data', (data) => { error += data.toString(); });
            verify.on('close', (code) => {
                if (code === 0 && output.includes(': OK')) resolve();
                else reject(new Error('Certificado no válido o no emitido por la CA. ' + error + output));
            });
        });

        return res.json({ success: true, message: 'Certificado válido y emitido por la CA.' });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Obtener información del certificado de la CA
exports.getCAInfo = async (req, res) => {
    const path = require('path');
    const fs = require('fs');
    const { spawn } = require('child_process');
    const caCertPath = path.join(__dirname, '../uploads/ca/ca.pem');
    if (!fs.existsSync(caCertPath)) {
        return res.status(404).json({ success: false, message: 'No existe el certificado de la CA.' });
    }
    let output = '';
    let error = '';
    const openssl = spawn('openssl', ['x509', '-in', caCertPath, '-noout', '-text']);
    openssl.stdout.on('data', (data) => { output += data.toString(); });
    openssl.stderr.on('data', (data) => { error += data.toString(); });
    openssl.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ success: false, message: 'Error leyendo el certificado de la CA.', error });
        }
        // Extraer subject, issuer, fechas, etc. usando regex
        const subject = output.match(/Subject: (.+)/)?.[1]?.trim() || '';
        const issuer = output.match(/Issuer: (.+)/)?.[1]?.trim() || '';
        const notBefore = output.match(/Not Before: (.+)/)?.[1]?.trim() || '';
        const notAfter = output.match(/Not After : (.+)/)?.[1]?.trim() || '';
        return res.json({
            success: true,
            subject,
            issuer,
            notBefore,
            notAfter
        });
    });
};

// Endpoint para aprobar una solicitud de certificado
exports.approveCertificateRequest = async (req, res) => {
    try {
        let { id } = req.params;
        console.log('Buscando solicitud con ID:', id, typeof id);
        const requestId = parseInt(id, 10);
        // Asegurar que sea número
        // Buscar la solicitud por ID
        const request = await CertificateRequest.findByPk(requestId);
        if (!request) {
            console.log('Solicitud no encontrada tras buscar por PK:', requestId);
            return res.status(404).json({ success: false, message: 'Solicitud de certificado no encontrada.' });
        }
        if (request.status !== 'pendiente') {
            console.log('Solicitud ya procesada:', requestId, 'Estado:', request.status);
            return res.status(400).json({ success: false, message: 'Esta solicitud ya no está pendiente.' });
        }
        // Usar el email de la solicitud para la carpeta
        const safeEmail = request.email.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeEmail);
        const userCSRPath = path.join(userDir, 'user.csr');
        const userCertPath = path.join(userDir, 'user.pem');
        const caDir = path.join(__dirname, '../uploads/ca');
        const caKeyPath = path.join(caDir, 'ca.key');
        const caCertPath = path.join(caDir, 'ca.pem');
        const caSrlPath = path.join(caDir, 'ca.srl'); // archivo de serial temporal

        console.log('Aprobar solicitud:', requestId);
        console.log('Rutas:', { userDir, userCSRPath, userCertPath, caDir, caKeyPath, caCertPath, caSrlPath });
        console.log('Archivos existen:', {
            userCSR: fs.existsSync(userCSRPath),
            caCert: fs.existsSync(caCertPath),
            userCert: fs.existsSync(userCertPath)
        });

        // Validar existencia de archivos necesarios (excepto ca.key)
        if (!fs.existsSync(userCSRPath) || !fs.existsSync(caCertPath)) {
            console.log('Faltan archivos requeridos (CSR o CA):', userCSRPath, caCertPath);
            return res.status(400).json({ success: false, message: 'Faltan archivos requeridos (CSR o CA).' });
        }

        // No sobrescribir si ya existe
        if (fs.existsSync(userCertPath)) {
            console.log('El certificado del usuario ya existe:', userCertPath);
            return res.status(400).json({ success: false, message: 'El certificado del usuario ya existe.' });
        }

        // 3. Firmar el CSR con la CA
        // Recuperar y descifrar la clave privada de la CA desde la base de datos
        const caKeyRecord = await CAKey.findOne();
        if (!caKeyRecord) {
            console.log('No se encontró la clave privada de la CA en la base de datos.');
            return res.status(500).json({ error: 'No se encontró la clave privada de la CA en la base de datos.' });
        }
        const masterKey = process.env.MASTER_KEY;
        if (!masterKey) {
            console.log('No se ha definido MASTER_KEY en el entorno.');
            return res.status(500).json({ error: 'No se ha definido MASTER_KEY en el entorno.' });
        }
        const caKeyBuffer = await decrypt(
            caKeyRecord.encryptedKey,
            masterKey,
            caKeyRecord.iv,
            caKeyRecord.salt,
            caKeyRecord.authTag
        );
        fs.writeFileSync(caKeyPath, caKeyBuffer);
        await new Promise((resolve, reject) => {
            const sign = spawn('openssl', [
                'x509', '-req', '-in', userCSRPath,
                '-CA', caCertPath, '-CAkey', caKeyPath,
                '-CAcreateserial', '-CAserial', caSrlPath,
                '-out', userCertPath, '-days', '365', '-sha256'
            ]);
            sign.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error firmando el CSR del usuario.'));
            });
        });
        if (fs.existsSync(caSrlPath)) fs.unlinkSync(caSrlPath);
        if (fs.existsSync(caKeyPath)) fs.unlinkSync(caKeyPath);
        // 5. Crear notificación con link de descarga
        const Notification = require('../models/Notification');
        const { io, userSockets } = require('../server');
        request.status = 'aceptada';
        await request.save();
        const downloadLink = `/api/ca/download-p12`;
        await Notification.create({
            userId: request.userId,
            mensaje: 'Tu solicitud de certificado ha sido aprobada. Descarga tu archivo .p12.',
            tipo: 'aprobada',
            leido: false,
            link: downloadLink
        });
        const socketId = userSockets.get(request.userId);
        if (socketId) {
            io.to(socketId).emit('nuevaNotificacion', {
                mensaje: 'Tu solicitud de certificado ha sido aprobada. Descarga tu archivo .p12.',
                tipo: 'aprobada',
                link: downloadLink,
                createdAt: new Date(),
            });
        }
        res.json({ message: 'Solicitud aprobada, certificado generado y notificación enviada.' });
    } catch (err) {
        console.log('Error en approveCertificateRequest:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Nueva función para generar y descargar el .p12 solo cuando el usuario lo solicita
exports.downloadUserP12 = async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
        }
        // Buscar usuario
        const User = require('../models/User');
        const user = await User.findOne({ where: { nombre: username, email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        // Buscar la solicitud aprobada más reciente
        const CertificateRequest = require('../models/CertificateRequest');
        const request = await CertificateRequest.findOne({
            where: { userId: user.id, status: 'aceptada' },
            order: [['updatedAt', 'DESC']]
        });
        if (!request || !request.password) {
            return res.status(404).json({ success: false, message: 'No hay solicitud aprobada o la contraseña ya fue eliminada.' });
        }
        // Rutas de archivos
        const safeEmail = email.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(__dirname, '../uploads/users', safeEmail);
        const userKeyPath = path.join(userDir, 'user.key');
        const userCertPath = path.join(userDir, 'user.pem');
        const caDir = path.join(__dirname, '../uploads/ca');
        const caCertPath = path.join(caDir, 'ca.pem');
        const userP12Path = path.join(userDir, 'user.p12');
        // Validar existencia de archivos necesarios
        if (!fs.existsSync(userKeyPath) || !fs.existsSync(userCertPath) || !fs.existsSync(caCertPath)) {
            return res.status(400).json({ success: false, message: 'Faltan archivos requeridos (clave, certificado o CA).' });
        }
        // Eliminar .p12 anterior si existe
        if (fs.existsSync(userP12Path)) {
            fs.unlinkSync(userP12Path);
        }
        // Generar el .p12 usando la contraseña guardada
        await new Promise((resolve, reject) => {
            const args = [
                'pkcs12', '-export', '-out', userP12Path,
                '-inkey', userKeyPath, '-in', userCertPath,
                '-certfile', caCertPath, '-password', `pass:${request.password}`
            ];
            const exportP12 = spawn('openssl', args);
            exportP12.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Error exportando a .p12.'));
            });
        });
        // Enviar el archivo .p12 como descarga directa
        res.download(userP12Path, `${safeEmail}.p12`, async (err) => {
            // Eliminar el archivo .p12 después de enviar
            try { if (fs.existsSync(userP12Path)) fs.unlinkSync(userP12Path); } catch {}
            // Borrar la contraseña de la solicitud por seguridad
            try { request.password = null; await request.save(); } catch {}
            // Eliminar archivos temporales del usuario
            try {
                ['user.key', 'user.pem', 'user.csr'].forEach(f => {
                    const filePath = path.join(userDir, f);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            } catch {}
            // Eliminar la notificación de tipo 'aprobada' para este usuario
            try {
                const Notification = require('../models/Notification');
                await Notification.destroy({ where: { userId: user.id, tipo: 'aprobada' } });
            } catch {}
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}; 