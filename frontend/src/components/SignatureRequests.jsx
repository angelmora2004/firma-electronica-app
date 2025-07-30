import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tabs,
    Tab,
    IconButton,
    Divider,
    Card,
    CardContent,
    CardActions,
    MenuItem,
    Grid
} from '@mui/material';
import {
    Description,
    Person,
    Schedule,
    CheckCircle,
    Cancel,
    Visibility,
    Send,
    Download,
    Warning,
    AccessTime,
    Message,
    VpnKey,
    Add,
    Save,
    Error,
    Close,
    Refresh
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from '../config/axios';
import PdfSignatureSelector from './PdfSignatureSelector';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

const StyledPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3)
}));

const RequestCard = styled(Card)(({ theme, status }) => ({
    background: 'rgba(26, 26, 26, 0.6)',
    border: `1px solid ${
        status === 'pendiente' ? 'rgba(255, 193, 7, 0.3)' :
        status === 'firmado' ? 'rgba(76, 175, 80, 0.3)' :
        status === 'rechazado' ? 'rgba(244, 67, 54, 0.3)' :
        'rgba(255, 255, 255, 0.1)'
    }`,
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
    }
}));

// Genera la imagen de la estampa (canvas a PNG)
async function generateStampImage({ qrData, firmante, organizacion, fecha }) {
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const qrImg = new window.Image();
    qrImg.src = qrDataUrl;
    await new Promise(resolve => { qrImg.onload = resolve; });
    ctx.drawImage(qrImg, 10, 10, 100, 100);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText('FIRMA DIGITAL', 120, 35);
    ctx.font = '16px Arial';
    ctx.fillText(`Firmado por: ${firmante}`, 120, 60);
    ctx.fillText(`Organización: ${organizacion}`, 120, 85);
    ctx.fillText(`Fecha firmado: ${fecha}`, 120, 110);
    const dataUrl = canvas.toDataURL('image/png');
    const res = await fetch(dataUrl);
    return new Uint8Array(await res.arrayBuffer());
}

// Inserta la estampa en el PDF con escalado proporcional
async function addStampToPDF({ pdfBuffer, stampImage, x, y, page = 0, canvasWidth, canvasHeight }) {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pngImage = await pdfDoc.embedPng(stampImage);
    const pages = pdfDoc.getPages();
    const targetPage = pages[page];
    // Tamaño real de la página PDF
    const pdfWidth = targetPage.getWidth();
    const pdfHeight = targetPage.getHeight();
    // Escala las coordenadas del canvas a las del PDF
    const scaledX = (x / canvasWidth) * pdfWidth;
    const scaledY = (y / canvasHeight) * pdfHeight;
    const stampWidth = 250;
    const stampHeight = 80;
    targetPage.drawImage(pngImage, {
        x: scaledX,
        y: pdfHeight - scaledY - stampHeight,
        width: stampWidth,
        height: stampHeight,
    });
    return await pdfDoc.save();
}

const SignatureRequests = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para modales
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [signingLoading, setSigningLoading] = useState(false);
    const [signaturePositionSelectorOpen, setSignaturePositionSelectorOpen] = useState(false);
    const [selectedSignaturePosition, setSelectedSignaturePosition] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
    const [loadingSignatureData, setLoadingSignatureData] = useState(false);
    const [certInfo, setCertInfo] = useState(null);
    const [canvasDimensions, setCanvasDimensions] = useState({ canvasWidth: 800, canvasHeight: 600 });
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Cargar solicitudes
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [receivedResponse, sentResponse] = await Promise.all([
                axios.get('/signature-requests/received'),
                axios.get('/signature-requests/sent')
            ]);

            setReceivedRequests(receivedResponse.data.data || []);
            setSentRequests(sentResponse.data.data || []);
        } catch (error) {
            setError('Error al cargar las solicitudes');
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Estados para el modal de firma
    const [signModalOpen, setSignModalOpen] = useState(false);
    const [selectedRequestForSign, setSelectedRequestForSign] = useState(null);
    const [signatureId, setSignatureId] = useState('');
    const [signaturePassword, setSignaturePassword] = useState('');
    const [userSignatures, setUserSignatures] = useState([]);

    // Cargar firmas del usuario
    const fetchUserSignatures = async () => {
        try {
            const response = await axios.get('/signatures');
            setUserSignatures(response.data);
        } catch (error) {
            console.error('Error cargando firmas:', error);
        }
    };

    // Firmar documento
    const handleSignDocument = async (request) => {
        setSelectedRequestForSign(request);
        setLoadingSignatureData(true);
        setError('');
        
        try {
            // Cargar firmas primero
            await fetchUserSignatures();
            
            console.log('Firmando documento:', request);
            
            // Para solicitudes recibidas, usar request.id directamente
            // Para solicitudes enviadas, necesitamos encontrar la solicitud individual del usuario actual
            let requestId = request.id;
            
            console.log('Request ID original:', requestId);
            console.log('Request recipients:', request.recipients);
            console.log('Request senderId:', request.senderId);
            
            // Para solicitudes simples, usar el ID directo
            requestId = request.id;
            console.log('Usando ID directo de la solicitud:', requestId);
            
            if (!requestId) {
                throw new Error('No se pudo encontrar el ID de la solicitud');
            }
            
            // Generar URL de preview del PDF
            const response = await axios.get(`/signature-requests/${requestId}/document`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setSignaturePositionSelectorOpen(true);
        } catch (error) {
            console.error('Error al cargar datos para firma:', error);
            setError('Error al cargar el documento o las firmas');
        } finally {
            setLoadingSignatureData(false);
        }
    };

    // Manejar selección de posición de firma
    const handleSignaturePositionSelected = (position, signatureId, password, canvasDimensions) => {
        setSelectedSignaturePosition(position);
        setSignatureId(signatureId);
        setSignaturePassword(password);
        setCanvasDimensions(canvasDimensions);
        setSignaturePositionSelectorOpen(false);
        setSignModalOpen(true);
    };

    // Obtener información del certificado
    const getCertInfo = async (signatureId, password) => {
        try {
            const { data } = await axios.post(`/signatures/${signatureId}/cert-info`, { password });
            return data;
        } catch (error) {
            console.error('Error obteniendo información del certificado:', error);
            return null;
        }
    };

    // Confirmar firma con estampa visual
    const confirmSignDocument = async () => {
        if (!signatureId || !signaturePassword) {
            setError('Por favor selecciona una firma e ingresa la contraseña');
            return;
        }

        setSigningLoading(true);
        setError('');
        setSuccess('');
        
        try {
            // 1. Obtener información del certificado para la estampa
            const certData = await getCertInfo(signatureId, signaturePassword);
            
            // 2. Obtener el PDF original
            let requestId = selectedRequestForSign.id;
            
            // Para solicitudes simples, usar el ID directo
            requestId = selectedRequestForSign.id;
            
            if (!requestId) {
                throw new Error('No se pudo encontrar el ID de la solicitud');
            }
            
            const pdfResponse = await axios.get(`/signature-requests/${requestId}/document`, {
                responseType: 'blob'
            });
            const pdfBuffer = await pdfResponse.data.arrayBuffer();

            // 3. Generar los datos para el QR y la estampa
            const qrData = JSON.stringify({
                firmante: certData?.commonName || 'Firmante',
                organizacion: certData?.organization || 'Sin organización',
                fecha: new Date().toLocaleDateString('es-ES')
            });

            // 4. Generar la estampa visual
            const stampImage = await generateStampImage({
                qrData,
                firmante: certData?.commonName || 'Firmante',
                organizacion: certData?.organization || 'Sin organización',
                fecha: new Date().toLocaleDateString('es-ES')
            });

            // 5. Usar las dimensiones reales del canvas
            const { canvasWidth, canvasHeight } = canvasDimensions;

            // 6. Insertar la estampa en el PDF con escalado
            const stampedPdfBytes = await addStampToPDF({
                pdfBuffer,
                stampImage,
                x: selectedSignaturePosition?.x || 100,
                y: selectedSignaturePosition?.y || 100,
                page: selectedSignaturePosition?.page || 0, // Usar la página donde se colocó la estampa
                canvasWidth,
                canvasHeight
            });

            // 7. Enviar el PDF con estampa al backend para firma digital
            const formData = new FormData();
            formData.append('pdf', new Blob([stampedPdfBytes], { type: 'application/pdf' }), 'documento_con_estampa.pdf');
            formData.append('signatureId', signatureId);
            formData.append('password', signaturePassword);

            await axios.put(`/signature-requests/${requestId}/sign`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess('Documento firmado correctamente');
            setSignModalOpen(false);
            setSelectedRequestForSign(null);
            setSignatureId('');
            setSignaturePassword('');
            setSelectedSignaturePosition(null);
            setCanvasDimensions({ canvasWidth: 800, canvasHeight: 600 });
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
                setPdfPreviewUrl('');
            }
            fetchRequests(); // Recargar lista
        } catch (error) {
            setError(error.response?.data?.message || 'Error al firmar el documento');
        } finally {
            setSigningLoading(false);
        }
    };

    // Rechazar solicitud
    const handleRejectRequest = async () => {
        if (!selectedRequest) return;

        try {
            await axios.put(`/signature-requests/${selectedRequest.id}/reject`, {
                reason: rejectionReason
            });
            setSuccess('Solicitud rechazada correctamente');
            setRejectDialogOpen(false);
            setSelectedRequest(null);
            setRejectionReason('');
            fetchRequests(); // Recargar lista
        } catch (error) {
            setError(error.response?.data?.message || 'Error al rechazar la solicitud');
        }
    };

    // Eliminar solicitud enviada
    const handleDeleteRequest = async (request) => {
        try {
            await axios.delete(`/signature-requests/${request.id}`);
            setSuccess('Solicitud eliminada correctamente');
            fetchRequests(); // Recargar lista
        } catch (error) {
            setError(error.response?.data?.message || 'Error al eliminar la solicitud');
        }
    };

    // Previsualizar documento
    const handlePreviewDocument = async (request) => {
        try {
            setPreviewLoading(true);
            
            console.log('Previsualizando documento:', request);
            
            // Para solicitudes recibidas, usar request.id directamente
            // Para solicitudes enviadas, necesitamos encontrar la solicitud individual del usuario actual
            let requestId = request.id;
            
            console.log('Preview - Request ID original:', requestId);
            console.log('Preview - Request recipients:', request.recipients);
            console.log('Preview - Request senderId:', request.senderId);
            
            // Para solicitudes simples, usar el ID directo
            requestId = request.id;
            console.log('Preview - Usando ID directo de la solicitud:', requestId);
            
            if (!requestId) {
                throw new Error('No se pudo encontrar el ID de la solicitud');
            }
            
            const response = await axios.get(`/signature-requests/${requestId}/document`, {
                responseType: 'blob'
            });
            
            // Crear blob con tipo MIME correcto para PDF
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setPreviewModalOpen(true);
        } catch (error) {
            console.error('Error al previsualizar:', error);
            setError('Error al previsualizar el documento');
        } finally {
            setPreviewLoading(false);
        }
    };

    // Descargar documento firmado
    const handleDownloadSigned = async (request) => {
        try {
            console.log('Downloading document:', request);
            
            // Usar el nuevo endpoint que funciona con documentId y documentType
            const response = await axios.get(`/signature-requests/download-signed/${request.documentId}/${request.documentType}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `documento_firmado_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            setSuccess('Documento descargado correctamente');
        } catch (error) {
            console.error('Error downloading:', error);
            setError('Error al descargar el documento firmado');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pendiente': return 'warning';
            case 'firmado': return 'success';
            case 'rechazado': return 'error';
            case 'expirado': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pendiente': return <Schedule />;
            case 'firmado': return <CheckCircle />;
            case 'rechazado': return <Cancel />;
            case 'expirado': return <AccessTime />;
            default: return <Description />;
        }
    };

    const renderRequestCard = (request, isReceived = true) => {
        // Determinar el color del borde basado en el estado
        const getBorderColor = (status) => {
            switch (status) {
                case 'pendiente': return 'rgba(255, 193, 7, 0.3)';
                case 'firmado': return 'rgba(76, 175, 80, 0.3)';
                case 'rechazado': return 'rgba(244, 67, 54, 0.3)';
                case 'expirado': return 'rgba(244, 67, 54, 0.3)';
                default: return 'rgba(255, 255, 255, 0.1)';
            }
        };

        return (
            <RequestCard 
                key={request.id || `${request.documentId}-${request.documentType}`} 
                status={request.status}
                sx={{ borderColor: getBorderColor(request.status) }}
            >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Description color="primary" />
                        </ListItemIcon>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {request.documentType === 'signed' ? 'Documento Firmado' : 'Documento Sin Firmar'}
                            </Typography>
                            {isReceived ? (
                                <Typography variant="body2" color="text.secondary">
                                    De: {request.sender?.nombre}
                                </Typography>
                            ) : (
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Para: {request.recipient?.email || 'Usuario'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                    <Chip
                        icon={getStatusIcon(request.status)}
                        label={request.status.toUpperCase()}
                        color={getStatusColor(request.status)}
                        size="small"
                    />
                </Box>

                {request.message && (
                    <Box sx={{ mb: 2, p: 2, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" mb={1}>
                            <Message sx={{ mr: 1, fontSize: '1rem' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Mensaje:
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {request.message}
                        </Typography>
                    </Box>
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                        Enviado: {new Date(request.createdAt).toLocaleString()}
                    </Typography>
                    {request.expiresAt && (
                        <Typography variant="caption" color="text.secondary">
                            Expira: {new Date(request.expiresAt).toLocaleString()}
                        </Typography>
                    )}
                </Box>

                {request.rejectionReason && (
                    <Box sx={{ mt: 2, p: 2, background: 'rgba(244, 67, 54, 0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" color="error">
                            <strong>Motivo del rechazo:</strong> {request.rejectionReason}
                        </Typography>
                    </Box>
                )}
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                {isReceived && request.status === 'pendiente' && (
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handlePreviewDocument(request)}
                            size="small"
                        >
                            Previsualizar
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={loadingSignatureData ? <CircularProgress size={16} /> : <CheckCircle />}
                            onClick={() => handleSignDocument(request)}
                            disabled={loadingSignatureData || signingLoading}
                            size="small"
                        >
                            {loadingSignatureData ? 'Cargando...' : 'Firmar'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => {
                                setSelectedRequest(request);
                                setRejectDialogOpen(true);
                            }}
                            size="small"
                        >
                            Rechazar
                        </Button>
                    </>
                )}

                {!isReceived && request.status === 'pendiente' && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleDeleteRequest(request)}
                        size="small"
                    >
                        Cancelar
                    </Button>
                )}

                {!isReceived && request.status === 'firmado' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            Documento firmado
                        </Typography>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Download />}
                            onClick={() => handleDownloadSigned(request)}
                            size="small"
                        >
                            Descargar
                        </Button>
                    </Box>
                )}

                {isReceived && request.status === 'firmado' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            Firmado el {new Date(request.signedAt).toLocaleString()}
                        </Typography>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Download />}
                            onClick={() => handleDownloadSigned(request)}
                            size="small"
                        >
                            Descargar
                        </Button>
                    </Box>
                )}
            </CardActions>
        </RequestCard>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
                Solicitudes de Firma
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {success}
                </Alert>
            )}

            <StyledPaper>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                    >
                        <Tab 
                            label={`Recibidas (${receivedRequests.length})`} 
                            icon={<Download />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label={`Enviadas (${sentRequests.length})`} 
                            icon={<Send />} 
                            iconPosition="start"
                        />
                    </Tabs>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchRequests}
                        disabled={loading}
                        size="small"
                    >
                        Refrescar
                    </Button>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        {activeTab === 0 && (
                            <Box>
                                {receivedRequests.length === 0 ? (
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                                        No tienes solicitudes de firma pendientes.
                                    </Typography>
                                ) : (
                                    receivedRequests.map(request => renderRequestCard(request, true))
                                )}
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                {sentRequests.length === 0 ? (
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                                        No has enviado ninguna solicitud de firma.
                                    </Typography>
                                ) : (
                                    sentRequests.map(request => renderRequestCard(request, false))
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </StyledPaper>

            {/* Dialog para rechazar solicitud */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Rechazar Solicitud de Firma</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        ¿Estás seguro de que quieres rechazar esta solicitud de firma?
                    </Typography>
                    <TextField
                        fullWidth
                        label="Motivo del rechazo (opcional)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        multiline
                        rows={3}
                        placeholder="Explica por qué rechazas firmar este documento..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialogOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRejectRequest}
                        variant="contained"
                        color="error"
                        startIcon={<Cancel />}
                    >
                        Rechazar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal para firmar documento */}
            <Dialog open={signModalOpen} onClose={() => setSignModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Firmar Documento</DialogTitle>
                <DialogContent>
                    {selectedRequestForSign && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Documento:</strong> {selectedRequestForSign.documentType === 'signed' ? 'Documento Firmado' : 'Documento Sin Firmar'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Selecciona tu firma digital y ingresa la contraseña para firmar este documento.
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        select
                        fullWidth
                        label="Seleccionar Firma"
                        value={signatureId}
                        onChange={(e) => setSignatureId(e.target.value)}
                        sx={{ mb: 3 }}
                        required
                    >
                        {userSignatures.map((signature) => (
                            <MenuItem key={signature.id} value={signature.id}>
                                {signature.fileName}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        fullWidth
                        label="Contraseña de la Firma"
                        type="password"
                        value={signaturePassword}
                        onChange={(e) => setSignaturePassword(e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSignModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={confirmSignDocument}
                        variant="contained"
                        color="success"
                        disabled={signingLoading || !signatureId || !signaturePassword}
                        startIcon={signingLoading ? <CircularProgress size={16} /> : <CheckCircle />}
                    >
                        {signingLoading ? 'Firmando...' : 'Firmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Selector de posición de firma */}
            {signaturePositionSelectorOpen && userSignatures.length > 0 && (
                <PdfSignatureSelector
                    open={signaturePositionSelectorOpen}
                    onClose={() => {
                        setSignaturePositionSelectorOpen(false);
                        if (pdfPreviewUrl) {
                            URL.revokeObjectURL(pdfPreviewUrl);
                            setPdfPreviewUrl('');
                        }
                    }}
                    onConfirm={handleSignaturePositionSelected}
                    pdfUrl={pdfPreviewUrl}
                    userSignatures={userSignatures}
                />
            )}

            {/* Modal de previsualización de PDF */}
            <Dialog 
                open={previewModalOpen} 
                onClose={() => {
                    setPreviewModalOpen(false);
                    if (pdfPreviewUrl) {
                        URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl('');
                    }
                }} 
                maxWidth="lg" 
                fullWidth
            >
                <DialogTitle>
                    Previsualizar Documento
                    <IconButton
                        onClick={() => {
                            setPreviewModalOpen(false);
                            if (pdfPreviewUrl) {
                                URL.revokeObjectURL(pdfPreviewUrl);
                                setPdfPreviewUrl('');
                            }
                        }}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {previewLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                            <CircularProgress />
                        </Box>
                    ) : pdfPreviewUrl ? (
                        <Box sx={{ width: '100%', height: '600px' }}>
                            <iframe
                                src={`/web/viewer.html?file=${encodeURIComponent(pdfPreviewUrl)}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px'
                                }}
                                title="PDF Viewer"
                            />
                        </Box>
                    ) : (
                        <Typography color="text.secondary">
                            Error al cargar el documento
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default SignatureRequests; 