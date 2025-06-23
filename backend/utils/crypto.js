const crypto = require('crypto');
const util = require('util');

const pbkdf2 = util.promisify(crypto.pbkdf2);
const scrypt = util.promisify(crypto.scrypt);
const randomBytes = util.promisify(crypto.randomBytes);

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

async function getKey(password, salt) {
    // Usamos PBKDF2 para derivar una clave segura a partir de la contraseña
    return await pbkdf2(password, salt, 100000, KEY_LENGTH, 'sha512');
}

async function encrypt(buffer, password) {
    const salt = await randomBytes(SALT_LENGTH);
    const iv = await randomBytes(IV_LENGTH);
    const key = await getKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedData,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

async function decrypt(encryptedData, password, ivHex, saltHex, authTagHex) {
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const key = await getKey(password, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    return decryptedData;
}

module.exports = {
    encrypt,
    decrypt
}; 