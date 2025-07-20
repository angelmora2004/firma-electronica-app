import React, { useEffect, useState } from 'react';
import axios from '../config/axios';
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, Divider, Card, CardContent, IconButton } from '@mui/material';
import { Article, Download, Delete } from '@mui/icons-material';
import CustomModal from './CustomModal';

const SignedDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  const fetchDocuments = async () => {
    try {
      const { data } = await axios.get('/signatures/signed-documents');
      setDocuments(data);
    } catch (error) {
      // Manejo de error opcional
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(`/signatures/signed-documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Manejo de error opcional
    }
  };

  const handleDelete = (doc) => {
    setDocToDelete(doc);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await axios.delete(`/signatures/signed-documents/${docToDelete.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
    } catch (error) {
      // Manejo de error opcional
    }
    setDeleteModalOpen(false);
    setDocToDelete(null);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Documentos Firmados
      </Typography>
      <Card sx={{ background: 'rgba(26, 26, 26, 0.8)', borderRadius: 4 }}>
        <CardContent>
          <List>
            {loading ? (
              <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>Cargando...</Typography>
            ) : documents.length > 0 ? (
              documents.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem
                    secondaryAction={
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Download />}
                          onClick={() => handleDownload(doc)}
                          sx={{ mr: 1 }}
                        >
                          Descargar
                        </Button>
                        <IconButton color="error" onClick={() => handleDelete(doc)}>
                          <Delete />
                        </IconButton>
                      </>
                    }
                  >
                    <ListItemIcon>
                      <Article color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.fileName}
                      secondary={`Firmado: ${new Date(doc.createdAt).toLocaleDateString()}`}
                    />
                  </ListItem>
                  {index < documents.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>
                No tienes documentos firmados todavía.
              </Typography>
            )}
          </List>
        </CardContent>
      </Card>
      <CustomModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        type="warning"
        title="Eliminar Documento Firmado"
        message="¿Seguro que deseas eliminar este documento firmado?"
      >
        <Card sx={{ p: 3, minWidth: 320, textAlign: 'center', boxShadow: 'none', background: 'transparent' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ¿Seguro que deseas eliminar este documento firmado?
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button variant="contained" color="primary" onClick={confirmDelete}>
              Aceptar
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
          </Box>
        </Card>
      </CustomModal>
    </Box>
  );
};

export default SignedDocuments; 