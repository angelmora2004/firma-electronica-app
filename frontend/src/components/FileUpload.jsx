import React, { useState, useEffect } from 'react';
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
    InputLabel
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
    LockOpen
} from '@mui/icons-material';
import CustomModal from './CustomModal';

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

    const { token } = useAuth();

    useEffect(() => {
        const fetchSignatures = async () => {
            try {
                const { data } = await axios.get('/signatures');
                setSignatures(data);
            } catch (err) {
                console.error('Error fetching signatures:', err);
            }
        };
        fetchSignatures();
    }, []);
    
    const handleFile = (selectedFile) => {
        if (selectedFile) {
            setFile(selectedFile);
            setFileUrl(URL.createObjectURL(selectedFile));
            setError('');
            setSuccess('');
            setIsUnlocked(false);
            setUnlockError('');
            setSelectedSignature('');
            setSignaturePassword('');
        }
    };

    const handleSubmit = async (e) => {
        // La lógica de firma se implementará aquí en el futuro
        e.preventDefault();
        alert('Funcionalidad de firma en desarrollo.');
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
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Ocurrió un error inesperado al intentar desbloquear la firma.';
            setModalInfo({ title: 'Error de Desbloqueo', message: errorMessage });
            setModalOpen(true);
            setIsUnlocked(false);
        } finally {
            setIsUnlocking(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setFileUrl('');
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
            {!file ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <UploadArea $isDragOver={isDragOver} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => document.getElementById('docInput').click()}>
                        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>Arrastra y suelta tu documento aquí</Typography>
                        <Typography color="text.secondary">o haz clic para seleccionar</Typography>
                        <Input type="file" id="docInput" onChange={(e) => handleFile(e.target.files[0])} sx={{ display: 'none' }} />
                    </UploadArea>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 4, mt: 2 }}>
                    
                    {/* Columna del Visor */}
                    <Box sx={{ width: { xs: '100%', md: '65%' } }}>
                        <Paper sx={{ height: '80vh', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 2 }}>
                            {file.type === 'application/pdf' ? (
                                <iframe src={fileUrl} width="100%" height="100%" title="preview" style={{ border: 'none' }} />
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Description sx={{ fontSize: 100 }} />
                                    <Typography variant="h5" sx={{ mt: 2 }}>{file.name}</Typography>
                                    <Typography color="text.secondary">No se puede previsualizar este tipo de archivo.</Typography>
                                </Box>
                            )}
                        </Paper>
                        <Button onClick={removeFile} color="error" sx={{ mt: 2 }}>Quitar archivo</Button>
                    </Box>

                    {/* Columna de Opciones */}
                    <Box sx={{ width: { xs: '100%', md: '30%' }, position: 'sticky', top: '100px' }}>
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Opciones de Firma</Typography>
                            
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Seleccionar Firma a Usar</InputLabel>
                                <Select value={selectedSignature} label="Seleccionar Firma a Usar" onChange={(e) => { setSelectedSignature(e.target.value); setIsUnlocked(false); setUnlockError(''); }}>
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
                                    <Button onClick={handleUnlockSignature} variant="outlined" disabled={isUnlocking || isUnlocked} startIcon={isUnlocking ? <CircularProgress size={20} /> : (isUnlocked ? <LockOpen /> : <Lock />)}>
                                        {isUnlocking ? 'Desbloqueando...' : (isUnlocked ? 'Firma Desbloqueada' : 'Desbloquear Firma')}
                                    </Button>
                                </Box>
                            )}
                            {unlockError && <Alert severity="error" sx={{ mt: 2 }}>{unlockError}</Alert>}
                            
                            <Box sx={{ mt: 4 }}>
                                <Button type="submit" variant="contained" fullWidth size="large" disabled={!isUnlocked} onClick={handleSubmit}>
                                    Firmar Documento
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default FileUpload; 