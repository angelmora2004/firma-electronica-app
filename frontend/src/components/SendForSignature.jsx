import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    Divider,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormLabel
} from '@mui/material';
import {
    Send,
    Description,
    Upload,
    Close,
    CheckCircle,
    Schedule,
    Person,
    Delete
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from '../config/axios';

const StyledPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3)
}));

const DocumentCard = styled(Paper)(({ theme, selected }) => ({
    background: selected ? 'rgba(0, 212, 170, 0.1)' : 'rgba(26, 26, 26, 0.6)',
    border: selected ? '2px solid rgba(0, 212, 170, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: theme.spacing(2),
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
        borderColor: 'rgba(0, 212, 170, 0.3)'
    }
}));

const SendForSignature = () => {
    const [documentType, setDocumentType] = useState('unsigned');
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [message, setMessage] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Estados para documentos
    const [signedDocuments, setSignedDocuments] = useState([]);
    const [unsignedDocuments, setUnsignedDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    
    // Estados para subir nuevo documento
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Cargar documentos del usuario
    const fetchDocuments = async () => {
        setDocumentsLoading(true);
        try {
            // Cargar documentos firmados
            const signedResponse = await axios.get('/signed-documents');
            setSignedDocuments(signedResponse.data);

            // Cargar documentos sin firmar
            const unsignedResponse = await axios.get('/unsigned-documents');
            setUnsignedDocuments(unsignedResponse.data.data || []);
        } catch (error) {
            console.error('Error al cargar documentos:', error);
        } finally {
            setDocumentsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Manejar subida de archivo
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Solo se permiten archivos PDF');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            setError('El archivo es demasiado grande. Máximo 10MB');
            return;
        }

        setUploadedFile(file);
        setError('');
    };

    // Subir documento sin firmar
    const uploadUnsignedDocument = async () => {
        if (!uploadedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', uploadedFile);
            formData.append('fileName', uploadedFile.name);

            const response = await axios.post('/unsigned-documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Añadir el nuevo documento a la lista
            setUnsignedDocuments(prev => [response.data.data, ...prev]);
            setSelectedDocument(response.data.data);
            setDocumentType('unsigned');
            setUploadDialogOpen(false);
            setUploadedFile(null);
            setSuccess('Documento subido correctamente');
        } catch (error) {
            setError(error.response?.data?.message || 'Error al subir el documento');
        } finally {
            setUploading(false);
        }
    };



    // Eliminar documento sin firmar
    const handleDeleteUnsignedDocument = async (docId) => {
        try {
            await axios.delete(`/unsigned-documents/${docId}`);
            setUnsignedDocuments(prev => prev.filter(doc => doc.id !== docId));
            setSuccess('Documento eliminado correctamente');
            
            // Si el documento eliminado era el seleccionado, limpiar selección
            if (selectedDocument?.id === docId && documentType === 'unsigned') {
                setSelectedDocument(null);
            }
        } catch (error) {
            setError('Error al eliminar el documento');
        }
    };

    // Enviar solicitud de firma
    const handleSendRequest = async () => {
        if (!selectedDocument || !recipientEmail.trim() || !expiresAt) {
            setError('Por favor completa todos los campos requeridos');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const requestData = {
                documentId: selectedDocument.id,
                documentType: documentType,
                recipientEmail: recipientEmail.trim(),
                message: message,
                expiresAt: expiresAt
            };

            await axios.post('/signature-requests/send', requestData);

            setSuccess('Solicitud de firma enviada correctamente');
            setSelectedDocument(null);
            setRecipientEmail('');
            setMessage('');
            setExpiresAt('');
        } catch (error) {
            setError(error.response?.data?.message || 'Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    // Generar fecha mínima (hoy + 1 día)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16);
    };

    const renderDocumentList = (documents, type) => (
        <List>
            {documents.map((doc) => (
                <ListItem key={doc.id} sx={{ p: 0, mb: 1 }}>
                    <DocumentCard
                        selected={selectedDocument?.id === doc.id && documentType === type}
                        onClick={() => {
                            setSelectedDocument(doc);
                            setDocumentType(type);
                        }}
                        sx={{ width: '100%' }}
                    >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center">
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Description color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={doc.fileName}
                                    secondary={`${type === 'signed' ? 'Firmado' : 'Sin firmar'} - ${new Date(doc.createdAt).toLocaleDateString()}`}
                                />
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                {selectedDocument?.id === doc.id && documentType === type && (
                                    <CheckCircle color="primary" />
                                )}
                                {type === 'unsigned' && (
                                    <IconButton
                                        color="error"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteUnsignedDocument(doc.id);
                                        }}
                                        title="Eliminar documento"
                                    >
                                        <Delete />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    </DocumentCard>
                </ListItem>
            ))}
        </List>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
                Enviar Documento para Firma
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
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Seleccionar Documento
                </Typography>

                <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <FormLabel component="legend">Tipo de Documento</FormLabel>
                    <RadioGroup
                        row
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                    >
                        <FormControlLabel
                            value="unsigned"
                            control={<Radio />}
                            label="Subir nuevo PDF"
                        />
                        <FormControlLabel
                            value="existing"
                            control={<Radio />}
                            label="Seleccionar documento existente"
                        />
                    </RadioGroup>
                </FormControl>

                {documentType === 'unsigned' && (
                    <Box sx={{ mb: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Upload />}
                            onClick={() => setUploadDialogOpen(true)}
                            sx={{ mb: 2 }}
                        >
                            Subir Nuevo PDF
                        </Button>
                        
                        {unsignedDocuments.length > 0 && (
                            <>
                                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                    Mis Documentos Sin Firmar:
                                </Typography>
                                {renderDocumentList(unsignedDocuments, 'unsigned')}
                            </>
                        )}
                    </Box>
                )}

                {documentType === 'existing' && (
                    <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                            Documentos Firmados:
                        </Typography>
                        {documentsLoading ? (
                            <CircularProgress />
                        ) : signedDocuments.length > 0 ? (
                            renderDocumentList(signedDocuments, 'signed')
                        ) : (
                            <Typography color="text.secondary">
                                No tienes documentos firmados.
                            </Typography>
                        )}

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                            Documentos Sin Firmar:
                        </Typography>
                        {documentsLoading ? (
                            <CircularProgress />
                        ) : unsignedDocuments.length > 0 ? (
                            renderDocumentList(unsignedDocuments, 'unsigned')
                        ) : (
                            <Typography color="text.secondary">
                                No tienes documentos sin firmar.
                            </Typography>
                        )}
                    </Box>
                )}
            </StyledPaper>

            {selectedDocument && (
                <StyledPaper>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        Detalles de la Solicitud
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Documento seleccionado:
                        </Typography>
                        <Chip
                            icon={<Description />}
                            label={selectedDocument.fileName}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        Destinatario
                    </Typography>
                    
                    <TextField
                        fullWidth
                        label="Email del Destinatario"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        type="email"
                        required
                        sx={{ mb: 3 }}
                        placeholder="usuario@ejemplo.com"
                    />

                    <TextField
                        fullWidth
                        label="Mensaje (opcional)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        multiline
                        rows={3}
                        sx={{ mb: 3 }}
                        placeholder="Añade un mensaje personalizado para el destinatario..."
                    />

                    <TextField
                        fullWidth
                        label="Fecha de Expiración"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: getMinDate() }}
                        sx={{ mb: 3 }}
                        required
                    />

                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                        onClick={handleSendRequest}
                        disabled={loading || !recipientEmail.trim() || !expiresAt}
                        fullWidth
                        size="large"
                    >
                        {loading ? 'Enviando...' : 'Enviar Solicitud de Firma'}
                    </Button>
                </StyledPaper>
            )}

            {/* Dialog para subir archivo */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Subir Nuevo PDF</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <input
                            accept=".pdf"
                            style={{ display: 'none' }}
                            id="file-upload"
                            type="file"
                            onChange={handleFileUpload}
                        />
                        <label htmlFor="file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<Upload />}
                                fullWidth
                            >
                                Seleccionar PDF
                            </Button>
                        </label>
                    </Box>
                    
                    {uploadedFile && (
                        <Box sx={{ p: 2, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                            <Typography variant="body2">
                                Archivo seleccionado: {uploadedFile.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Tamaño: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={uploadUnsignedDocument}
                        variant="contained"
                        disabled={!uploadedFile || uploading}
                        startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
                    >
                        {uploading ? 'Subiendo...' : 'Subir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SendForSignature; 