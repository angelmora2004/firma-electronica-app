import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Button, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, ListItemIcon, Divider, Tabs, Tab, Alert
} from '@mui/material';
import { CheckCircle, Warning, Info, Close } from '@mui/icons-material';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const statusColors = {
    pendiente: 'warning',
    aceptada: 'success',
    rechazada: 'error'
};

const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [selected, setSelected] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [rechazoOpen, setRechazoOpen] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [accionLoading, setAccionLoading] = useState(false);
    const [accionMsg, setAccionMsg] = useState('');

    const fetchSolicitudes = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get('/ca/admin/certificate-requests');
            setSolicitudes(data);
        } catch (err) {
            setError('Error al obtener solicitudes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const handleAprobar = async (sol) => {
        setAccionLoading(true);
        setAccionMsg('');
        console.log('Aprobar solicitud:', sol);
        try {
            await axios.post(`/ca/admin/certificate-requests/${sol.id}/approve`, {
                username: sol.User?.nombre || sol.email
            });
            setAccionMsg('Solicitud aprobada correctamente.');
            fetchSolicitudes();
            setModalOpen(false);
        } catch (err) {
            setAccionMsg('Error al aprobar la solicitud.');
        } finally {
            setAccionLoading(false);
        }
    };

    const handleRechazar = async (sol) => {
        setAccionLoading(true);
        setAccionMsg('');
        try {
            await axios.post(`/ca/admin/certificate-requests/${sol.id}/reject`, { comentario: motivo });
            setAccionMsg('Solicitud rechazada correctamente.');
            fetchSolicitudes();
            setRechazoOpen(false);
            setModalOpen(false);
            setMotivo('');
        } catch (err) {
            setAccionMsg('Error al rechazar la solicitud.');
        } finally {
            setAccionLoading(false);
        }
    };

    const filteredSolicitudes = solicitudes.filter(s => {
        if (activeTab === 0) return s.status === 'pendiente';
        if (activeTab === 1) return s.status === 'aceptada';
        if (activeTab === 2) return s.status === 'rechazada';
        return true;
    });

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', p: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>Panel de Administración</Typography>
                <Button variant="outlined" color="secondary" onClick={() => { logout(); navigate('/login'); }} startIcon={<Close />}>Cerrar Sesión</Button>
            </Box>
            <Paper sx={{ p: 2, mb: 4, background: 'rgba(26,26,26,0.9)', borderRadius: 4 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
                    <Tab label="Pendientes" />
                    <Tab label="Aprobadas" />
                    <Tab label="Rechazadas" />
                </Tabs>
            </Paper>
            {loading ? <CircularProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <List>
                    {filteredSolicitudes.length === 0 ? (
                        <Typography color="text.secondary">No hay solicitudes en esta categoría.</Typography>
                    ) : filteredSolicitudes.map(sol => (
                        <React.Fragment key={sol.id}>
                            <ListItem button onClick={() => { setSelected(sol); setModalOpen(true); }} sx={{ mb: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <ListItemIcon>
                                    {sol.status === 'pendiente' ? <Info color="warning" /> : sol.status === 'aceptada' ? <CheckCircle color="success" /> : <Warning color="error" />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={<>
                                        <Typography sx={{ fontWeight: 600 }}>{sol.User?.nombre || 'Usuario'}</Typography>
                                        <Chip label={sol.status} color={statusColors[sol.status]} size="small" sx={{ ml: 2 }} />
                                    </>}
                                    secondary={<>
                                        <Typography variant="body2">Correo: {sol.email}</Typography>
                                        <Typography variant="caption" color="text.secondary">{new Date(sol.createdAt).toLocaleString()}</Typography>
                                    </>}
                                />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            )}
            {/* Modal de detalles de solicitud */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Detalles de la Solicitud</DialogTitle>
                <DialogContent>
                    {selected && (
                        <Box>
                            <Typography><b>Usuario:</b> {selected.User?.nombre}</Typography>
                            <Typography><b>Correo:</b> {selected.email}</Typography>
                            <Typography><b>País:</b> {selected.country}</Typography>
                            <Typography><b>Estado:</b> {selected.state}</Typography>
                            <Typography><b>Ciudad:</b> {selected.locality}</Typography>
                            <Typography><b>Fecha de solicitud:</b> {new Date(selected.createdAt).toLocaleString()}</Typography>
                            <Typography><b>Estado:</b> <Chip label={selected.status} color={statusColors[selected.status]} size="small" /></Typography>
                            {selected.status === 'rechazada' && selected.adminComment && (
                                <Alert severity="error" sx={{ mt: 2 }}>Motivo de rechazo: {selected.adminComment}</Alert>
                            )}
                        </Box>
                    )}
                    {accionMsg && <Alert severity="info" sx={{ mt: 2 }}>{accionMsg}</Alert>}
                </DialogContent>
                <DialogActions>
                    {selected && selected.status === 'pendiente' && (
                        <>
                            <Button onClick={() => setRechazoOpen(true)} color="error" variant="outlined" startIcon={<Warning />}>Rechazar</Button>
                            <Button onClick={() => handleAprobar(selected)} color="success" variant="contained" startIcon={<CheckCircle />}>Aprobar</Button>
                        </>
                    )}
                    <Button onClick={() => setModalOpen(false)} startIcon={<Close />}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            {/* Modal para motivo de rechazo */}
            <Dialog open={rechazoOpen} onClose={() => setRechazoOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Motivo de Rechazo</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Motivo"
                        fullWidth
                        multiline
                        minRows={2}
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRechazoOpen(false)}>Cancelar</Button>
                    <Button onClick={() => handleRechazar(selected)} color="error" variant="contained" disabled={accionLoading}>
                        {accionLoading ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminDashboard; 