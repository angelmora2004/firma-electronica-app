import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import { 
    NavigateBefore, 
    NavigateNext, 
    ZoomIn, 
    ZoomOut, 
    FitScreen,
    RotateRight
} from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
} catch (error) {
    console.warn('Error configurando PDF worker:', error);
    // Fallback a configuración básica
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const NativePDFViewer = ({ 
    fileUrl, 
    onPageChange, 
    currentPage, 
    stampPosition, 
    showStampPreview,
    onStampPositionChange 
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.2);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar el PDF
    useEffect(() => {
        if (!fileUrl) return;

        const loadPDF = async () => {
            try {
                setLoading(true);
                setError(null);

                const loadingTask = pdfjsLib.getDocument(fileUrl);
                const pdf = await loadingTask.promise;
                
                setPdfDocument(pdf);
                setTotalPages(pdf.numPages);
                setLoading(false);
                
                // Ajustar automáticamente el tamaño después de cargar
                setTimeout(() => {
                    fitToWidth();
                }, 100);
            } catch (err) {
                console.error('Error cargando PDF:', err);
                
                // Manejar errores específicos del worker
                if (err.name === 'WorkerError' || err.message.includes('worker')) {
                    setError('Error de configuración del visor PDF. Recarga la página.');
                } else {
                    setError('Error al cargar el PDF');
                }
                setLoading(false);
            }
        };

        loadPDF();
    }, [fileUrl]);

    // Renderizar la página actual
    useEffect(() => {
        if (!pdfDocument || !canvasRef.current) return;

        let isRendering = false;
        let renderTask = null;

        const renderPage = async () => {
            if (isRendering) {
                // Cancelar renderizado anterior si está en progreso
                if (renderTask) {
                    renderTask.cancel();
                }
            }

            try {
                isRendering = true;
                const page = await pdfDocument.getPage(currentPage);
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                const viewport = page.getViewport({ scale, rotation });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                renderTask = page.render(renderContext);
                await renderTask.promise;
            } catch (err) {
                if (err.name !== 'RenderingCancelled') {
                    console.error('Error renderizando página:', err);
                }
            } finally {
                isRendering = false;
                renderTask = null;
            }
        };

        renderPage();

        return () => {
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDocument, currentPage, scale, rotation]);

    // Navegación
    const goToPage = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            onPageChange(pageNumber);
        }
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    // Zoom
    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const rotatePDF = () => setRotation(prev => (prev + 90) % 360);
    const fitToWidth = () => {
        if (containerRef.current && canvasRef.current) {
            const containerWidth = containerRef.current.clientWidth - 40; // Margen
            const canvasWidth = canvasRef.current.width;
            const newScale = containerWidth / canvasWidth;
            setScale(Math.min(newScale, 2.5));
        }
    };

    // Manejar clics en el canvas para posicionar la estampa
    const handleCanvasClick = (e) => {
        if (!showStampPreview) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        
        if (!canvas || !container) return;

        // Obtener la posición del clic relativa al canvas
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;

        // Solo actualizar si la posición es válida dentro del canvas
        if (x >= 0 && y >= 0 && x <= canvasRect.width && y <= canvasRect.height) {
            onStampPositionChange({ x, y });
            console.log(`Estampa posicionada en: x=${x}, y=${y}, canvas: ${canvasRect.width}x${canvasRect.height}`);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="600px">
                <Typography>Cargando PDF...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="600px">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            {/* Controles de navegación */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={prevPage} disabled={currentPage <= 1}>
                        <NavigateBefore />
                    </IconButton>
                    <Typography variant="body2">
                        Página {currentPage} de {totalPages}
                    </Typography>
                    <IconButton onClick={nextPage} disabled={currentPage >= totalPages}>
                        <NavigateNext />
                    </IconButton>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut />
                    </IconButton>
                    <Typography variant="body2">{Math.round(scale * 100)}%</Typography>
                    <IconButton onClick={zoomIn} disabled={scale >= 3.0}>
                        <ZoomIn />
                    </IconButton>
                    <IconButton onClick={fitToWidth}>
                        <FitScreen />
                    </IconButton>
                    <IconButton onClick={rotatePDF} title="Rotar PDF">
                        <RotateRight />
                    </IconButton>
                </Box>
            </Box>

            {/* Contenedor del PDF */}
            <Box 
                ref={containerRef}
                sx={{ 
                    overflow: 'auto', 
                    height: 'calc(100% - 80px)',
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
                        margin: '20px',
                        backgroundColor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        style={{ 
                            cursor: showStampPreview ? 'crosshair' : 'default',
                            display: 'block',
                            maxWidth: '100%',
                            height: 'auto'
                        }}
                        title={showStampPreview ? 'Haz clic para posicionar la estampa QR' : ''}
                    />
                    
                    {/* Estampa QR preview simplificada - dentro del contenedor del canvas */}
                    {showStampPreview && stampPosition.x > 0 && stampPosition.y > 0 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: stampPosition.x - 100, // Centrar la estampa (mitad de 200px)
                                top: stampPosition.y - 40, // Centrar la estampa (mitad de 80px)
                                width: 200, // Mismo ancho que la estampa real
                                height: 80, // Mismo alto que la estampa real
                                backgroundColor: 'rgba(0, 123, 255, 0.9)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 1000,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                border: '2px solid white',
                                pointerEvents: 'none', // Evitar que interfiera con clics
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 123, 255, 1)',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Box sx={{ textAlign: 'center', color: 'white' }}>
                                <Box sx={{ fontSize: '14px', fontWeight: 'bold' }}>QR</Box>
                            </Box>
                        </Box>
                    )}
                    

                </Box>
            </Box>
        </Paper>
    );
};

export default NativePDFViewer; 