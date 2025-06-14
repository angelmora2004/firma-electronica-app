import React, { useState } from 'react';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Button,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    Input
} from '@mui/material';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { token } = useAuth();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError('');
        } else {
            setFile(null);
            setError('Por favor, selecciona un archivo PDF válido');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, selecciona un archivo');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            setError('');
            setSuccess('');

            const response = await axios.post(
                '/files/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setSuccess('Archivo subido correctamente');
            setFile(null);
            // Limpiar el input de archivo después de la subida exitosa
            e.target.elements.fileInput.value = '';
        } catch (error) {
            setError(error.response?.data?.message || 'Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 'md', mx: 'auto', p: 3, bgcolor: 'background.paper', borderRadius: '8px', boxShadow: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
                Subir Archivo PDF
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Seleccionar archivo PDF
                    </Typography>
                    <Input
                        type="file"
                        id="fileInput"
                        inputProps={{ accept: ".pdf" }}
                        onChange={handleFileChange}
                        fullWidth
                        sx={{ mb: 1 }}
                    />
                    {file && (
                        <Typography variant="body2" color="text.secondary">
                            Archivo seleccionado: {file.name}
                        </Typography>
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={uploading || !file}
                    sx={{
                        py: 1.5,
                        mt: 2
                    }}
                >
                    {uploading ? <CircularProgress size={24} /> : 'Subir Archivo'}
                </Button>
            </Box>
        </Box>
    );
};

export default FileUpload; 