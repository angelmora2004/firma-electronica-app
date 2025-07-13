const express = require('express');
const router = express.Router();
const caController = require('../controllers/caController');

// Endpoint para crear la CA
router.post('/create', caController.createCA);
// Endpoint para generar clave privada y CSR de usuario
router.post('/user-csr', caController.createUserKeyAndCSR);
// Endpoint para firmar el CSR del usuario y emitir el certificado
router.post('/sign-user', caController.signUserCSR);
// Endpoint para exportar clave y certificado del usuario a .p12
router.post('/export-p12', caController.exportUserP12);
// Endpoint para verificar que el certificado del usuario fue emitido por la CA
router.post('/verify-cert', caController.verifyUserCert);
// Endpoint para obtener información del certificado de la CA
router.get('/info', caController.getCAInfo);

module.exports = router; 