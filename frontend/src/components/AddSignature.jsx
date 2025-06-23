import React, { useState } from 'react';
import axios from '../config/axios';
import {
    Box,
    Button,
    Typography,
    Input,
    Paper,
    TextField,
    Alert,
    CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    VpnKey,
    CheckCircle,
    Error
} from '@mui/icons-material';

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
    '&:hover': {
        borderColor: theme.palette.primary.main,
        background: 'rgba(0, 212, 170, 0.05)',
    }
}));

const StyledButton = styled(Button)(({ theme }) => ({
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    borderRadius: 12,
    padding: '12px 36px',
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
    marginTop: theme.spacing(4),
}));

const AddSignature = ({ onSignatureAdded }) => {
    const [file, setFile] = useState(null);
    const [password, setPassword] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        handleFile(selectedFile);
    };

    const handleFile = (selectedFile) => {
        if (selectedFile && (selectedFile.name.endsWith('.p12') || selectedFile.name.endsWith('.pfx'))) {
            setFile(selectedFile);
            setError('');
            setSuccess('');
        } else {
            setFile(null);
            setError('Por favor, selecciona un archivo .p12 o .pfx válido.');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFile(droppedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, selecciona un archivo.');
            return;
        }
        if (!password) {
            setError('Por favor, introduce la contraseña de tu firma.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', password);

        try {
            setUploading(true);
            setError('');
            setSuccess('');

            await axios.post('/signatures/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess('¡Firma subida y asegurada con éxito!');
            setFile(null);
            setPassword('');
            
            // Llamar a la función para refrescar la lista de firmas en el dashboard
            if (onSignatureAdded) {
                onSignatureAdded();
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Error al subir la firma.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 'lg', mx: 'auto' }} component="form" onSubmit={handleSubmit}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                Añadir Firma
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Busca o arrastra tu Firma Electrónica desde tu Ordenador
            </Typography>

            <UploadArea
                $isDragOver={isDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('signatureInput').click()}
            >
                <VpnKey sx={{ fontSize: 60, color: 'primary.main', mb: 3 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {file ? `Archivo seleccionado: ${file.name}` : 'Arrastra tu Firma en archivo .p12 o .pfx aquí.'}
                </Typography>
                
                <Input
                    type="file"
                    id="signatureInput"
                    inputProps={{ accept: ".p12, .pfx" }}
                    sx={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </UploadArea>

            {file && (
                <TextField
                    label="Contraseña de la Firma"
                    type="password"
                    variant="outlined"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mt: 3 }}
                    required
                />
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 3 }} icon={<Error />}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircle />}>
                    {success}
                </Alert>
            )}

            <StyledButton
                type="submit"
                variant="contained"
                disabled={!file || !password || uploading}
            >
                {uploading ? <CircularProgress size={24} color="inherit" /> : 'Subir y Cifrar Firma'}
            </StyledButton>
        </Box>
    );
};

export default AddSignature; 