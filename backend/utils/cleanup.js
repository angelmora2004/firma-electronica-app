const fs = require('fs').promises;
const path = require('path');

// Función para limpiar archivos temporales antiguos
async function cleanupTempFiles() {
    try {
        const tempDir = path.join(__dirname, '../uploads/temp_sign');
        
        // Verificar si el directorio existe
        try {
            await fs.access(tempDir);
        } catch {
            return; // El directorio no existe, no hay nada que limpiar
        }
        
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutos
        
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            try {
                const stats = await fs.stat(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Archivo temporal eliminado: ${file}`);
                }
            } catch (error) {
                console.error(`Error eliminando archivo temporal ${file}:`, error);
            }
        }
    } catch (error) {
        console.error('Error en limpieza de archivos temporales:', error);
    }
}

// Ejecutar limpieza cada 10 minutos
setInterval(cleanupTempFiles, 10 * 60 * 1000);

// Ejecutar limpieza inicial
cleanupTempFiles();

module.exports = { cleanupTempFiles }; 