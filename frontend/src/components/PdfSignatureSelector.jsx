import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    TextField,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add,
    Delete,
    Save,
    Cancel,
    VpnKey,
    CheckCircle,
    Error,
    NavigateBefore,
    NavigateNext
} from '@mui/icons-material';

import axios from '../config/axios';
import { pdfjsLib } from '../config/pdfConfig';



const PdfSignatureSelector = ({ open, onClose, onConfirm, pdfUrl, userSignatures }) => {
    const [signaturePositions, setSignaturePositions] = useState([]);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlockLoading, setUnlockLoading] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [selectedSignature, setSelectedSignature] = useState('');
    const [signaturePassword, setSignaturePassword] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [previousSignatures, setPreviousSignatures] = useState([]);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const handleAddSignature = (event) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Solo agregar si el clic está dentro del canvas
        if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
            const newPosition = {
                id: Date.now(),
                x: x - 75, // Centrar la firma
                y: y - 30,
                page: currentPage // Incluir la página actual
            };

            setSignaturePositions([...signaturePositions, newPosition]);
            setSelectedPosition(newPosition.id);
            setIsAdding(false);
        }
    };

    const handleSelectPosition = (positionId) => {
        setSelectedPosition(positionId);
    };

    const handleDeletePosition = (positionId) => {
        setSignaturePositions(signaturePositions.filter(p => p.id !== positionId));
        if (selectedPosition === positionId) {
            setSelectedPosition(null);
        }
    };

    // Cargar el PDF cuando se abre el selector
    useEffect(() => {
        if (open && pdfUrl && isUnlocked) {
            loadPDF();
        }
    }, [open, pdfUrl, isUnlocked]);

    const loadPDF = async () => {
        if (!pdfUrl) return;
        
        try {
            setLoading(true);
            
            // Hacer la petición HTTP para obtener el PDF y los headers
            const response = await fetch(pdfUrl);
            const previousSignaturesHeader = response.headers.get('X-Previous-Signatures');
            
            if (previousSignaturesHeader) {
                try {
                    const signatures = JSON.parse(previousSignaturesHeader);
                    setPreviousSignatures(signatures);
                    console.log('Firmas anteriores encontradas:', signatures);
                } catch (error) {
                    console.error('Error parseando firmas anteriores:', error);
                }
            }
            
            const loadingTask = pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.93/cmaps/',
                cMapPacked: true,
            });
            
            const pdf = await loadingTask.promise;
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(0);
            setLoading(false);
        } catch (error) {
            console.error('Error cargando PDF:', error);
            setLoading(false);
        }
    };

    // Renderizar la página actual
    useEffect(() => {
        if (!pdfDocument || !canvasRef.current) return;

        const renderPage = async () => {
            try {
                const page = await pdfDocument.getPage(currentPage + 1);
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                const viewport = page.getViewport({ scale: 1.2 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
            } catch (error) {
                console.error('Error renderizando página:', error);
            }
        };

        renderPage();
    }, [pdfDocument, currentPage]);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber - 1); // Convertir de 1-indexed a 0-indexed
    };

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleConfirm = () => {
        if (selectedPosition && selectedSignature && signaturePassword) {
            const position = signaturePositions.find(p => p.id === selectedPosition);
            
            // Obtener las dimensiones reales del canvas
            const canvas = canvasRef.current;
            const canvasWidth = canvas ? canvas.width : 800;
            const canvasHeight = canvas ? canvas.height : 600;
            
            onConfirm(position, selectedSignature, signaturePassword, {
                canvasWidth,
                canvasHeight
            });
        }
        // Limpiar estados
        setSignaturePositions([]);
        setSelectedPosition(null);
        setIsAdding(false);
        setIsUnlocked(false);
        setUnlockError('');
        setSelectedSignature('');
        setSignaturePassword('');
        setPdfDocument(null);
        setTotalPages(0);
        setCurrentPage(0);
        setPreviousSignatures([]);
        onClose();
    };

    const handleUnlockSignature = async () => {
        if (!selectedSignature || !signaturePassword) {
            setUnlockError('Selecciona una firma e ingresa la contraseña');
            return;
        }

        setUnlockLoading(true);
        setUnlockError('');

        try {
            const response = await axios.post(`/signatures/${selectedSignature}/unlock`, {
                password: signaturePassword
            });

            setIsUnlocked(true);
            setUnlockError('');
        } catch (error) {
            setUnlockError(error.response?.data?.message || 'Error al desbloquear la firma');
        } finally {
            setUnlockLoading(false);
        }
    };

    const handleCancel = () => {
        setSignaturePositions([]);
        setSelectedPosition(null);
        setIsAdding(false);
        setIsUnlocked(false);
        setUnlockError('');
        setSelectedSignature('');
        setSignaturePassword('');
        setPdfDocument(null);
        setTotalPages(0);
        setCurrentPage(0);
        setPreviousSignatures([]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
            <DialogTitle>
                Seleccionar Posición de Firma
                <Typography variant="body2" color="text.secondary">
                    Haz clic en el documento para añadir una posición de firma, luego selecciona la posición deseada
                </Typography>
            </DialogTitle>
            <DialogContent>
                {!isUnlocked ? (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Seleccionar Firma Digital
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Primero selecciona tu firma digital y desbloquéala para poder añadir posiciones de firma al documento.
                        </Typography>
                        
                        <TextField
                            select
                            fullWidth
                            label="Seleccionar Firma"
                            value={selectedSignature || ''}
                            onChange={(e) => setSelectedSignature(e.target.value)}
                            sx={{ mb: 2 }}
                            required
                        >
                            {userSignatures?.map((signature) => (
                                <MenuItem key={signature.id} value={signature.id}>
                                    {signature.fileName}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            fullWidth
                            label="Contraseña de la Firma"
                            type="password"
                            value={signaturePassword || ''}
                            onChange={(e) => setSignaturePassword(e.target.value)}
                            sx={{ mb: 2 }}
                            required
                        />

                        {unlockError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {unlockError}
                            </Alert>
                        )}

                        <Button
                            variant="contained"
                            onClick={handleUnlockSignature}
                            disabled={unlockLoading || !selectedSignature || !signaturePassword}
                            startIcon={unlockLoading ? <CircularProgress size={16} /> : <VpnKey />}
                            sx={{ mb: 2 }}
                        >
                            {unlockLoading ? 'Desbloqueando...' : 'Desbloquear Firma'}
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Alert severity="success" sx={{ flex: 1 }}>
                            Firma desbloqueada correctamente. Ahora puedes añadir posiciones de firma al documento.
                        </Alert>
                        <Button
                            variant={isAdding ? "contained" : "outlined"}
                            startIcon={<Add />}
                            onClick={() => setIsAdding(true)}
                            disabled={isAdding}
                            color={isAdding ? "primary" : "inherit"}
                        >
                            {isAdding ? "Haz clic en el PDF" : "Añadir Posición"}
                        </Button>
                        {isAdding && (
                            <Button
                                variant="outlined"
                                startIcon={<Cancel />}
                                onClick={() => setIsAdding(false)}
                                color="error"
                                size="small"
                            >
                                Cancelar
                            </Button>
                        )}
                        <Chip
                            label={`Página ${currentPage + 1}`}
                            color="primary"
                            variant="outlined"
                        />
                        {selectedPosition && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => handleDeletePosition(selectedPosition)}
                            >
                                Eliminar Seleccionada
                            </Button>
                        )}
                    </Box>
                )}

                {isUnlocked && (
                    <Box sx={{ height: '500px', position: 'relative' }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                <CircularProgress />
                            </Box>
                        ) : pdfDocument ? (
                            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                                {/* Controles de navegación */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <IconButton onClick={prevPage} disabled={currentPage <= 0}>
                                            <NavigateBefore />
                                        </IconButton>
                                        <Typography variant="body2">
                                            Página {currentPage + 1} de {totalPages}
                                        </Typography>
                                        <IconButton onClick={nextPage} disabled={currentPage >= totalPages - 1}>
                                            <NavigateNext />
                                        </IconButton>
                                    </Box>
                                    
                                    {/* Mostrar firmas anteriores */}
                                    {previousSignatures.length > 0 && (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body2" color="primary">
                                                Firmas anteriores:
                                            </Typography>
                                            {previousSignatures.map((sig, index) => (
                                                <Chip
                                                    key={index}
                                                    label={`${sig.nombre} (${sig.fecha})`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Box>

                                {/* Contenedor del PDF */}
                                <Box 
                                    ref={containerRef}
                                    sx={{ 
                                        overflow: 'auto', 
                                        height: 'calc(100% - 60px)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'flex-start',
                                        position: 'relative',
                                        backgroundColor: '#f5f5f5'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            margin: '10px',
                                            backgroundColor: 'white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            borderRadius: '4px',
                                            overflow: 'visible' // Cambiar a visible para que se vean los overlays
                                        }}
                                    >
                                        <canvas
                                            ref={canvasRef}
                                            onClick={isAdding ? handleAddSignature : undefined}
                                            style={{ 
                                                cursor: isAdding ? 'crosshair' : 'default',
                                                display: 'block'
                                            }}
                                        />
                                        {/* Overlay para mostrar las posiciones de estampas */}
                                        {signaturePositions
                                            .filter(position => position.page === currentPage)
                                            .map((position) => (
                                            <Box
                                                key={position.id}
                                                sx={{
                                                    position: 'absolute',
                                                    left: position.x + 10, // Ajustar por el margen del contenedor
                                                    top: position.y + 10,
                                                    width: 150,
                                                    height: 60,
                                                    border: selectedPosition === position.id ? '2px solid #1976d2' : '2px dashed #666',
                                                    backgroundColor: selectedPosition === position.id ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        borderColor: '#1976d2',
                                                        backgroundColor: 'rgba(25, 118, 210, 0.2)'
                                                    }
                                                }}
                                                onClick={() => handleSelectPosition(position.id)}
                                            >
                                                <Typography variant="caption" color="text.secondary">
                                                    Firma {position.id} (Página {position.page + 1})
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </Paper>
                        ) : (
                            <Typography variant="body1" color="text.secondary">
                                Error al cargar el PDF
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Lista de posiciones de firma */}
                {signaturePositions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Posiciones de firma ({signaturePositions.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {signaturePositions.map((position) => (
                                <Chip
                                    key={position.id}
                                    label={`Firma ${position.id} (Página ${position.page + 1})`}
                                    color={selectedPosition === position.id ? 'primary' : 'default'}
                                    onClick={() => handleSelectPosition(position.id)}
                                    onDelete={() => handleDeletePosition(position.id)}
                                    deleteIcon={<Delete />}
                                />
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} startIcon={<Cancel />}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!selectedPosition || !isUnlocked}
                    startIcon={<Save />}
                >
                    Confirmar Posición
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PdfSignatureSelector; 