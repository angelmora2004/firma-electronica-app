const UnsignedDocument = require('../models/UnsignedDocument');
const SignedDocument = require('../models/SignedDocument');
const { Op } = require('sequelize');

/**
 * Limpia documentos sin firmar que ya fueron firmados
 * Compara fechas de creación para identificar documentos que probablemente ya fueron procesados
 */
const cleanupUnsignedDocuments = async () => {
    try {
        console.log('🔄 Iniciando limpieza automática de documentos sin firmar...');
        
        // Obtener todos los documentos sin firmar
        const unsignedDocs = await UnsignedDocument.findAll({
            attributes: ['id', 'userId', 'fileName', 'createdAt']
        });
        
        let deletedCount = 0;
        
        for (const unsignedDoc of unsignedDocs) {
            // Buscar documentos firmados del mismo usuario creados después del documento sin firmar
            const signedDocs = await SignedDocument.findAll({
                where: {
                    userId: unsignedDoc.userId,
                    createdAt: {
                        [Op.gte]: unsignedDoc.createdAt
                    }
                },
                attributes: ['id', 'fileName', 'createdAt'],
                order: [['createdAt', 'ASC']]
            });
            
            // Si hay documentos firmados después de este documento sin firmar,
            // probablemente ya fue procesado
            if (signedDocs.length > 0) {
                // Verificar si el documento sin firmar tiene más de 1 día
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                
                if (unsignedDoc.createdAt < oneDayAgo) {
                    await unsignedDoc.destroy();
                    deletedCount++;
                    console.log(`🗑️ Eliminado documento sin firmar: ${unsignedDoc.fileName} (ID: ${unsignedDoc.id})`);
                }
            }
        }
        
        console.log(`✅ Limpieza completada. ${deletedCount} documentos sin firmar eliminados.`);
        return deletedCount;
        
    } catch (error) {
        console.error('❌ Error durante la limpieza automática:', error);
        throw error;
    }
};

/**
 * Limpia documentos sin firmar expirados (más de 30 días)
 */
const cleanupExpiredUnsignedDocuments = async () => {
    try {
        console.log('🔄 Iniciando limpieza de documentos sin firmar expirados...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const deletedCount = await UnsignedDocument.destroy({
            where: {
                createdAt: {
                    [Op.lt]: thirtyDaysAgo
                }
            }
        });
        
        console.log(`✅ Limpieza de expirados completada. ${deletedCount} documentos eliminados.`);
        return deletedCount;
        
    } catch (error) {
        console.error('❌ Error durante la limpieza de expirados:', error);
        throw error;
    }
};

/**
 * Ejecuta ambas limpiezas
 */
const runCleanup = async () => {
    try {
        console.log('🚀 Iniciando proceso de limpieza automática...');
        
        const expiredCount = await cleanupExpiredUnsignedDocuments();
        const processedCount = await cleanupUnsignedDocuments();
        
        console.log(`🎉 Limpieza completada. Total eliminados: ${expiredCount + processedCount}`);
        
        return {
            expiredCount,
            processedCount,
            totalCount: expiredCount + processedCount
        };
        
    } catch (error) {
        console.error('❌ Error en el proceso de limpieza:', error);
        throw error;
    }
};

module.exports = {
    cleanupUnsignedDocuments,
    cleanupExpiredUnsignedDocuments,
    runCleanup
}; 