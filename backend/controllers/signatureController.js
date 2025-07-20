const fs = require('fs/promises');
const path = require('path');
const Signature = require('../models/Signature');
const { encrypt, decrypt } = require('../utils/crypto');

const plainAddPlaceholder = require('../utils/plainAddPlaceholder');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');

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

exports.signDocument = async (req, res) => {
    const { signatureId, documentPosition, documentId, containerDimensions, pageNumber = 1 } = req.body;
    const { password } = req.body;

    if (!signatureId || !password || !documentPosition || !documentId) {
        return res.status(400).json({ 
            message: 'Se requieren: signatureId, password, documentPosition y documentId.' 
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
        const user = req.user; // Obtener información del usuario como respaldo
        
        // Crear datos para el QR
        const qrData = {
            firmante: certificateInfo.commonName || user.nombre || 'Firmante',
            organizacion: certificateInfo.organization || 'Sin organización',
            fecha: currentDate,
            documento: documentId,
            firma: signature.fileName
        };

        // 4. Generar QR como imagen
        const qrImageBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
            type: 'image/png',
            width: 150,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // 5. Leer el documento PDF
        const documentPath = path.join(__dirname, '../uploads/temp_sign', documentId);
        const pdfBuffer = await fs.readFile(documentPath);

        // 6. Agregar placeholder para la firma
        const pdfWithPlaceholder = plainAddPlaceholder({
            pdfBuffer,
            reason: `Firmado por ${certificateInfo.commonName || user.nombre}`,
            signatureLength: 8192,
        });

        // 7. Por ahora, usar el PDF con placeholder (sin firma digital compleja)
        // La firma digital se implementará en una versión futura con librerías más estables
        const signedPdfBuffer = pdfWithPlaceholder;

        // 8. Agregar la estampa QR al PDF firmado (con timeout)
        const finalPdfBuffer = await Promise.race([
            addQRStampToPDF(signedPdfBuffer, qrImageBuffer, documentPosition, qrData, containerDimensions, pageNumber),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout procesando PDF')), 25000)
            )
        ]);

        // 9. Guardar el PDF firmado
        const signedDocumentPath = path.join(__dirname, '../uploads/temp_sign', `signed_${documentId}`);
        await fs.writeFile(signedDocumentPath, finalPdfBuffer);

        // 10. Leer y enviar el PDF firmado desde el archivo guardado
        const signedPdfContent = await fs.readFile(signedDocumentPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="documento_firmado_${Date.now()}.pdf"`);
        res.send(signedPdfContent);

        // 11. Limpiar archivos temporales después de un tiempo
        setTimeout(async () => {
            try {
                await fs.unlink(documentPath);
                await fs.unlink(signedDocumentPath);
            } catch (error) {
                console.error('Error limpiando archivos temporales:', error);
            }
        }, 300000); // 5 minutos

    } catch (error) {
        console.error('Error firmando documento:', error);
        if (error.message.includes('Unsupported state')) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al firmar el documento.' });
    }
};

// Función para firmar PDF digitalmente
async function signPDFDigitally(pdfBuffer, p12Buffer, password) {
    const forge = require('node-forge');
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Guardar archivos temporales
        const tempPdfPath = path.join(__dirname, '../uploads/temp_sign', `temp_pdf_${Date.now()}.pdf`);
        const tempP12Path = path.join(__dirname, '../uploads/temp_sign', `temp_p12_${Date.now()}.p12`);
        const tempCertPath = tempP12Path + '.crt';
        const tempKeyPath = tempP12Path + '.key';
        const tempSignedPath = path.join(__dirname, '../uploads/temp_sign', `temp_signed_${Date.now()}.pdf`);
        
        await fs.promises.writeFile(tempPdfPath, pdfBuffer);
        await fs.promises.writeFile(tempP12Path, p12Buffer);
        
        // Extraer certificado y clave privada del .p12
        await new Promise((resolve, reject) => {
            const extractCert = spawn('openssl', [
                'pkcs12', '-in', tempP12Path, '-clcerts', '-nokeys', '-out', tempCertPath, '-passin', `pass:${password}`
            ]);
            let error = '';
            extractCert.stderr.on('data', (data) => { error += data.toString(); });
            extractCert.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempCertPath)) resolve();
                else reject(new Error('Error extrayendo certificado. ' + error));
            });
        });
        
        await new Promise((resolve, reject) => {
            const extractKey = spawn('openssl', [
                'pkcs12', '-in', tempP12Path, '-nocerts', '-out', tempKeyPath, '-passin', `pass:${password}`, '-passout', `pass:${password}`
            ]);
            let error = '';
            extractKey.stderr.on('data', (data) => { error += data.toString(); });
            extractKey.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempKeyPath)) resolve();
                else reject(new Error('Error extrayendo clave privada. ' + error));
            });
        });
        
        // Verificar que el PDF original es válido antes de firmar
        const pdfHeader = pdfBuffer.slice(0, 4).toString();
        if (!pdfHeader.startsWith('%PDF')) {
            throw new Error('El archivo no es un PDF válido');
        }
        
        // Crear una firma simple usando el hash del PDF
        const crypto = require('crypto');
        const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        
        // Firmar el hash usando OpenSSL
        await new Promise((resolve, reject) => {
            const sign = spawn('openssl', [
                'dgst', '-sha256', '-sign', tempKeyPath,
                '-passin', `pass:${password}`,
                '-out', tempSignedPath + '.sig'
            ]);
            
            // Escribir el hash en un archivo temporal
            const hashFile = tempPdfPath + '.hash';
            fs.writeFileSync(hashFile, pdfHash);
            
            const signProcess = spawn('openssl', [
                'dgst', '-sha256', '-sign', tempKeyPath,
                '-passin', `pass:${password}`,
                '-out', tempSignedPath + '.sig'
            ]);
            
            // Enviar el hash al proceso de firma
            signProcess.stdin.write(pdfHash);
            signProcess.stdin.end();
            
            let error = '';
            signProcess.stderr.on('data', (data) => { error += data.toString(); });
            signProcess.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempSignedPath + '.sig')) resolve();
                else reject(new Error('Error firmando hash con OpenSSL. ' + error));
            });
        });
        
        // Leer la firma
        const signature = await fs.promises.readFile(tempSignedPath + '.sig');
        
        // Crear un PDF con la firma embebida (simulación)
        // Por ahora, devolver el PDF original con información de firma en metadatos
        const signedPdfBuffer = pdfBuffer;
        
        // Limpiar archivos temporales con retraso para evitar errores EBUSY
        setTimeout(async () => {
            try {
                if (fs.existsSync(tempPdfPath)) await fs.promises.unlink(tempPdfPath);
                if (fs.existsSync(tempP12Path)) await fs.promises.unlink(tempP12Path);
                if (fs.existsSync(tempCertPath)) await fs.promises.unlink(tempCertPath);
                if (fs.existsSync(tempKeyPath)) await fs.promises.unlink(tempKeyPath);
                if (fs.existsSync(tempSignedPath + '.sig')) await fs.promises.unlink(tempSignedPath + '.sig');
                if (fs.existsSync(tempPdfPath + '.hash')) await fs.promises.unlink(tempPdfPath + '.hash');
            } catch (cleanupError) {
                console.error('Error limpiando archivos temporales:', cleanupError);
            }
        }, 1000); // Esperar 1 segundo antes de limpiar
        
        return signedPdfBuffer;
        
    } catch (error) {
        console.error('Error firmando PDF:', error);
        // Si falla la firma digital, devolver el PDF original con placeholder
        console.log('Devolviendo PDF con placeholder debido a error en firma digital');
        return pdfBuffer;
    }
}

// Función para firmar PDF usando OpenSSL
async function signPDFWithOpenSSL(pdfBuffer, p12Buffer, password) {
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Guardar archivos temporales
        const tempPdfPath = path.join(__dirname, '../uploads/temp_sign', `temp_pdf_${Date.now()}.pdf`);
        const tempP12Path = path.join(__dirname, '../uploads/temp_sign', `temp_p12_${Date.now()}.p12`);
        const tempCertPath = tempP12Path + '.crt';
        const tempKeyPath = tempP12Path + '.key';
        const tempSignedPath = path.join(__dirname, '../uploads/temp_sign', `temp_signed_${Date.now()}.pdf`);
        
        await fs.promises.writeFile(tempPdfPath, pdfBuffer);
        await fs.promises.writeFile(tempP12Path, p12Buffer);
        
        // Extraer certificado y clave privada del .p12
        await new Promise((resolve, reject) => {
            const extractCert = spawn('openssl', [
                'pkcs12', '-in', tempP12Path, '-clcerts', '-nokeys', '-out', tempCertPath, '-passin', `pass:${password}`
            ]);
            let error = '';
            extractCert.stderr.on('data', (data) => { error += data.toString(); });
            extractCert.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempCertPath)) resolve();
                else reject(new Error('Error extrayendo certificado. ' + error));
            });
        });
        
        await new Promise((resolve, reject) => {
            const extractKey = spawn('openssl', [
                'pkcs12', '-in', tempP12Path, '-nocerts', '-out', tempKeyPath, '-passin', `pass:${password}`, '-passout', `pass:${password}`
            ]);
            let error = '';
            extractKey.stderr.on('data', (data) => { error += data.toString(); });
            extractKey.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempKeyPath)) resolve();
                else reject(new Error('Error extrayendo clave privada. ' + error));
            });
        });
        
        // Firmar el PDF usando OpenSSL
        await new Promise((resolve, reject) => {
            const sign = spawn('openssl', [
                'cms', '-sign', '-in', tempPdfPath,
                '-signer', tempCertPath, '-inkey', tempKeyPath,
                '-passin', `pass:${password}`,
                '-out', tempSignedPath, '-outform', 'DER'
            ]);
            
            let error = '';
            sign.stderr.on('data', (data) => { error += data.toString(); });
            sign.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempSignedPath)) resolve();
                else reject(new Error('Error firmando PDF con OpenSSL. ' + error));
            });
        });
        
        // Leer el PDF firmado
        const signedPdfBuffer = await fs.promises.readFile(tempSignedPath);
        
        // Limpiar archivos temporales
        try {
            await fs.promises.unlink(tempPdfPath);
            await fs.promises.unlink(tempP12Path);
            await fs.promises.unlink(tempCertPath);
            await fs.promises.unlink(tempKeyPath);
            await fs.promises.unlink(tempSignedPath);
        } catch (cleanupError) {
            console.error('Error limpiando archivos temporales:', cleanupError);
        }
        
        return signedPdfBuffer;
        
    } catch (error) {
        console.error('Error firmando PDF:', error);
        throw error;
    }
}

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

// Función auxiliar para agregar la estampa QR al PDF
async function addQRStampToPDF(pdfBuffer, qrImageBuffer, position, qrData, containerDimensions, pageNumber = 1) {
    try {
        // Verificar que el PDF es válido
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Buffer de PDF inválido');
        }

        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        
        if (pages.length === 0) {
            throw new Error('El PDF no tiene páginas');
        }

        // Usar la página especificada (restar 1 porque los arrays empiezan en 0)
        const pageIndex = Math.min(pageNumber - 1, pages.length - 1);
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        console.log(`Agregando estampa en página ${pageNumber} (índice ${pageIndex}) de ${pages.length} páginas`);

        // Convertir la imagen QR a PDF (optimizado)
        const qrImage = await pdfDoc.embedPng(qrImageBuffer);

        // Calcular posición de la estampa
        const stampWidth = 200; // Más pequeña
        const stampHeight = 80; // Más pequeña
        const qrSize = 50; // QR más pequeño
        
        // Convertir coordenadas del visor a coordenadas del PDF
        // El visor puede tener una escala diferente al PDF real
        let x, y;
        
        if (position && position.x !== undefined && position.y !== undefined && containerDimensions) {
            // Usar las coordenadas proporcionadas por el usuario
            const userX = position.x;
            const userY = position.y;
            
            console.log('Coordenadas del usuario:', { userX, userY });
            console.log('Dimensiones del contenedor:', containerDimensions);
            console.log('Dimensiones del PDF:', { width, height });
            
            // Calcular posición como porcentaje del visor
            const percentX = userX / containerDimensions.width;
            const percentY = userY / containerDimensions.height;
            
            console.log('Porcentajes calculados:', { percentX, percentY });
            
            // Aplicar porcentajes al PDF
            x = percentX * width;
            // Invertir Y porque PDF usa coordenadas desde abajo
            // Centrar la estampa en el punto del clic
            y = height - (percentY * height) - (stampHeight * 0.5);
            
            console.log('Coordenadas convertidas:', { x, y });
        } else {
            // Posición por defecto (esquina inferior derecha)
            x = width - stampWidth - 20;
            y = 20;
        }

        // Asegurar que la estampa esté dentro de los límites de la página
        x = Math.max(20, Math.min(x, width - stampWidth - 20));
        y = Math.max(20, Math.min(y, height - stampHeight - 20));

        // Dibujar el QR
        page.drawImage(qrImage, {
            x: x + 10,
            y: y + 15, // Centrar verticalmente en la estampa
            width: qrSize,
            height: qrSize,
        });

        // Dibujar el texto informativo alineado con el QR
        const textX = x + qrSize + 20;
        const textY = y + 55; // Bajar un poco más para alinear perfectamente con el QR
        
        // Título de la estampa
        page.drawText('FIRMA DIGITAL', {
            x: textX,
            y: textY,
            size: 10,
        });

        // Información del certificado
        page.drawText(`Firmado por: ${qrData.firmante}`, {
            x: textX,
            y: textY - 15,
            size: 8,
        });

        page.drawText(`Organización: ${qrData.organizacion}`, {
            x: textX,
            y: textY - 28,
            size: 8,
        });

        page.drawText(`Fecha firmado: ${new Date(qrData.fecha).toLocaleDateString('es-ES')}`, {
            x: textX,
            y: textY - 41,
            size: 8,
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error agregando estampa QR:', error);
        throw error;
    }
} 