const path = require('path');

// Subir un archivo
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se ha subido ningún archivo' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Archivo subido correctamente',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Error al subir archivo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al subir el archivo',
            error: error.message 
        });
    }
};

// Obtener un archivo
exports.getFile = async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads/files', filename);
        
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error al obtener archivo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el archivo',
            error: error.message 
        });
    }
}; 