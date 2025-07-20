import React, { useState, useEffect, useRef } from 'react';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Button,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    Input,
    Card,
    CardContent,
    Chip,
    IconButton,
    Paper,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    CloudUpload,
    Description,
    CheckCircle,
    Error,
    Delete,
    Security,
    VerifiedUser,
    Lock,
    LockOpen,
    QrCode,
    QrCode2 as QrCode2Icon,
    Download,
    Close,
    Info
} from '@mui/icons-material';
import CustomModal from './CustomModal';
import NativePDFViewer from './NativePDFViewer';

const UploadArea = styled(Paper)(({ theme, $isDragOver }) => ({
    border: `2px dashed ${$isDragOver ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.2)'}`,
    borderRadius: 16,
    padding: theme.spacing(8),
    textAlign: 'center',
    background: $isDragOver ? 'rgba(0, 212, 170, 0.05)' : 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    width: '60%',
    minHeight: '400px',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        background: 'rgba(0, 212, 170, 0.05)',
    }
}));

const StyledCard = styled(Card)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        borderColor: 'rgba(0, 212, 170, 0.3)',
    }
}));

const StyledButton = styled(Button)(({ theme }) => ({
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: '0 4px 20px rgba(0, 212, 170, 0.3)',
    '&:hover': {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        boxShadow: '0 6px 25px rgba(0, 212, 170, 0.4)',
        transform: 'translateY(-2px)',
    },
    transition: 'all 0.3s ease',
    '&:disabled': {
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'rgba(255, 255, 255, 0.5)',
        boxShadow: 'none',
        transform: 'none',
    }
}));



const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    
    const [signatures, setSignatures] = useState([]);
    const [selectedSignature, setSelectedSignature] = useState('');
    const [signaturePassword, setSignaturePassword] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlockError, setUnlockError] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalInfo, setModalInfo] = useState({ title: '', message: '' });

    // Nuevos estados para la funcionalidad de firma
    const [documentId, setDocumentId] = useState('');
    const [stampPosition, setStampPosition] = useState({ x: 0, y: 0 });
    const [signingLoading, setSigningLoading] = useState(false);
    const [signingProgress, setSigningProgress] = useState('');
    const [showStampPreview, setShowStampPreview] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const { token, user } = useAuth();

    // Verificar si el usuario está autenticado
    useEffect(() => {
        if (!token) {
            window.location.href = '/login';
        }
    }, [token]);



    useEffect(() => {
        const fetchSignatures = async () => {
            try {
                // Solo intentar cargar firmas si hay un token
                if (token) {
                    const { data } = await axios.get('/signatures');
                    setSignatures(data);
                }
            } catch (err) {
                console.error('Error fetching signatures:', err);
                // Si hay error 401, redirigir al login
                if (err.response?.status === 401) {
                    window.location.href = '/login';
                }
            }
        };
        fetchSignatures();
    }, [token]);
    
    const handleFile = async (selectedFile) => {
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                setError('Solo se permiten archivos PDF.');
                return;
            }

            setUploading(true);
            setError('');
            setSuccess('');

            try {
                // Subir el archivo al servidor
                const formData = new FormData();
                formData.append('document', selectedFile);

                const response = await axios.post('/files/upload-for-signing', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                setDocumentId(response.data.documentId);
                setFile(selectedFile);
                setFileUrl(URL.createObjectURL(selectedFile));
                setSuccess('Documento subido correctamente. Ahora selecciona y desbloquea una firma para continuar.');
            } catch (err) {
                setError(err.response?.data?.message || 'Error al subir el documento.');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleUnlockSignature = async () => {
        if (!selectedSignature || !signaturePassword) {
            setUnlockError('Por favor, selecciona una firma e introduce la contraseña.');
            return;
        }
        setIsUnlocking(true);
        setUnlockError('');
        try {
            await axios.post(`/signatures/${selectedSignature}/unlock`, { password: signaturePassword });
            setIsUnlocked(true);
            setShowStampPreview(true); // Mostrar estampa solo después de desbloquear
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Ocurrió un error inesperado al intentar desbloquear la firma.';
            setModalInfo({ title: 'Error de Desbloqueo', message: errorMessage });
            setModalOpen(true);
            setIsUnlocked(false);
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleSignDocument = async () => {
        if (!isUnlocked || !documentId) {
            setError('Por favor, desbloquea una firma primero.');
            return;
        }

        setSigningLoading(true);
        setError('');
        setSigningProgress('Iniciando proceso de firma...');

        try {
            setSigningProgress('Procesando documento y generando estampa QR...');
            
            // Obtener las dimensiones reales del canvas del PDF
            const canvas = document.querySelector('canvas');
            const containerDimensions = canvas ? {
                width: canvas.width,
                height: canvas.height
            } : {
                width: 800,
                height: 600
            };

            console.log('Dimensiones del canvas enviadas:', containerDimensions);
            console.log('Posición de la estampa:', stampPosition);

            // Usar la página actual del estado
            const pageToUse = currentPage;

            const response = await axios.post('/signatures/sign-document', {
                signatureId: selectedSignature,
                password: signaturePassword,
                documentId: documentId,
                documentPosition: stampPosition,
                containerDimensions: containerDimensions,
                pageNumber: pageToUse
            }, {
                responseType: 'blob'
            });

            // Crear y descargar el archivo firmado
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `documento_firmado_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSigningProgress('Descargando documento...');
            setSuccess('Documento procesado exitosamente. Se agregó estampa QR con información del certificado digital.');
            
            // Limpiar el estado
            setFile(null);
            setFileUrl('');
            setDocumentId('');
            setShowStampPreview(false);
            setIsUnlocked(false);
            setSelectedSignature('');
            setSignaturePassword('');
            setStampPosition({ x: 0, y: 0 });

        } catch (err) {
            console.error('Error firmando documento:', err);
            setError(err.response?.data?.message || 'Error al firmar el documento.');
        } finally {
            setSigningLoading(false);
            setSigningProgress('');
        }
    };







    const removeFile = () => {
        setFile(null);
        setFileUrl('');
        setDocumentId('');
        setShowStampPreview(false);
        setStampPosition({ x: 0, y: 0 });
        setIsUnlocked(false);
        setUnlockError('');
        setSelectedSignature('');
        setSignaturePassword('');
        setCurrentPage(1);
    };

    return (
        <Box>
            <CustomModal 
                open={modalOpen}
                handleClose={() => setModalOpen(false)}
                title={modalInfo.title}
                message={modalInfo.message}
                type="error"
            />
            
            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
                    {success}
                </Alert>
            </Snackbar>

            {!file ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <UploadArea $isDragOver={isDragOver} 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} 
                        onDragLeave={() => setIsDragOver(false)} 
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }} 
                        onClick={() => document.getElementById('docInput').click()}
                    >
                        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>Arrastra y suelta tu documento PDF aquí</Typography>
                        <Typography color="text.secondary">o haz clic para seleccionar</Typography>
                        <Input type="file" id="docInput" onChange={(e) => handleFile(e.target.files[0])} sx={{ display: 'none' }} accept=".pdf" />
                    </UploadArea>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 4, mt: 2 }}>
                    
                    {/* Columna del Visor */}
                    <Box sx={{ width: { xs: '100%', md: '65%' } }}>
                        <Paper sx={{ height: '80vh', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 2, position: 'relative' }}>
                            <NativePDFViewer
                                fileUrl={fileUrl}
                                onPageChange={setCurrentPage}
                                currentPage={currentPage}
                                stampPosition={stampPosition}
                                showStampPreview={showStampPreview}
                                onStampPositionChange={setStampPosition}
                            />
                        </Paper>
                        <Button onClick={removeFile} color="error" sx={{ mt: 2 }}>Quitar archivo</Button>
                    </Box>

                    {/* Columna de Opciones */}
                    <Box sx={{ width: { xs: '100%', md: '30%' }, position: 'sticky', top: '100px' }}>
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Opciones de Firma</Typography>
                            
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Seleccionar Firma a Usar</InputLabel>
                                <Select 
                                    value={selectedSignature} 
                                    label="Seleccionar Firma a Usar" 
                                    onChange={(e) => { 
                                        setSelectedSignature(e.target.value); 
                                        setIsUnlocked(false); 
                                        setUnlockError(''); 
                                    }}
                                >
                                    {signatures.map((sig) => (
                                        <MenuItem key={sig.id} value={sig.id}>{sig.fileName}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {selectedSignature && (
                                <Box>
                                    <TextField
                                        label="Contraseña de la Firma"
                                        type="password"
                                        fullWidth
                                        value={signaturePassword}
                                        onChange={(e) => setSignaturePassword(e.target.value)}
                                        sx={{ mb: 2 }}
                                        disabled={isUnlocked}
                                    />
                                    <Button 
                                        onClick={handleUnlockSignature} 
                                        variant="outlined" 
                                        disabled={isUnlocking || isUnlocked} 
                                        startIcon={isUnlocking ? <CircularProgress size={20} /> : (isUnlocked ? <LockOpen /> : <Lock />)}
                                    >
                                        {isUnlocking ? 'Desbloqueando...' : (isUnlocked ? 'Firma Desbloqueada' : 'Desbloquear Firma')}
                                    </Button>
                                </Box>
                            )}
                            {unlockError && <Alert severity="error" sx={{ mt: 2 }}>{unlockError}</Alert>}
                            
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    <Info sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                                    Arrastra la estampa en el documento para posicionarla donde desees. La estampa aparecerá en la página donde la coloques.
                                </Typography>
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    fullWidth 
                                    size="large" 
                                    disabled={!isUnlocked || signingLoading}
                                    onClick={handleSignDocument}
                                    startIcon={signingLoading ? <CircularProgress size={20} /> : <Download />}
                                >
                                    {signingLoading ? 'Firmando...' : 'Firmar Documento'}
                                </Button>
                                {signingProgress && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                                        {signingProgress}
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default FileUpload; 