import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Grid,
    Tabs,
    Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';

const DashboardBackgroundBox = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    minWidth: '100vw',
    background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
    padding: theme.spacing(2, 0),
}));

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState(0); // 0 para Firmar, 1 para Subir Documento, 2 para Perfil
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handlePasswordChange = (e) => {
        setPasswordFormData({
            ...passwordFormData,
            [e.target.name]: e.target.value
        });
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setUpdateMessage({ text: '', type: '' });

        if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
            setUpdateMessage({ text: 'Las nuevas contraseñas no coinciden', type: 'error' });
            return;
        }

        setUpdateLoading(true);
        try {
            // Asumiendo endpoint PUT /api/auth/profile para actualizar contraseña
            await axios.put('/auth/profile', {
                currentPassword: passwordFormData.currentPassword,
                newPassword: passwordFormData.newPassword
            });
            setUpdateMessage({ text: 'Contraseña actualizada con éxito', type: 'success' });
            setPasswordFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // Limpiar formulario
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            setUpdateMessage({ text: error.response?.data?.message || 'Error al actualizar contraseña', type: 'error' });
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            // Asumiendo endpoint DELETE /api/auth/me para eliminar cuenta
            await axios.delete('/auth/me');
            // Si la eliminación es exitosa, redirigir al login
            logout(); // Limpiar contexto de autenticación
            // La redirección se maneja en el interceptor de axios o aquí si logout incluye navigate
        } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            // Mostrar mensaje de error si la eliminación falla
            alert(error.response?.data?.message || 'Error al eliminar cuenta');
            setDeleteLoading(false);
            setDeleteConfirmOpen(false);
        }
    };

    if (!user) {
        // Esto no debería pasar si ProtectedRoute funciona, pero es buena práctica
        return <CircularProgress />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 0:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>Sección de Firmar de Ejemplo</Typography>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>Subir Documento para Firma</Typography>
                        <FileUpload />
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>Perfil del Usuario</Typography>

                        {updateMessage.text && (
                            <Typography color={updateMessage.type === 'success' ? 'success.main' : 'error.main'} sx={{ mb: 2 }}>
                                {updateMessage.text}
                            </Typography>
                        )}

                        {/* Sección Información del Usuario */}
                        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" gutterBottom component="div">Información de la Cuenta</Typography>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={logout}
                                    size="small"
                                >
                                    Cerrar Sesión
                                </Button>
                            </Box>
                            <Typography variant="body1">Nombre: {user.nombre}</Typography>
                            <Typography variant="body1">Correo Electrónico: {user.email}</Typography>
                            {/* Puedes añadir más información si user la tiene (ej. rol) */}
                            {/*user.rol && <Typography variant="body1">Rol: {user.rol}</Typography>*/}
                        </Paper>

                        {/* Sección Cambiar Contraseña */}
                        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                            <Typography variant="h6" gutterBottom>Cambiar Contraseña</Typography>
                            <Box component="form" onSubmit={handleUpdatePassword} sx={{ mt: 2 }}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="currentPassword"
                                    label="Contraseña Actual"
                                    type="password"
                                    value={passwordFormData.currentPassword}
                                    onChange={handlePasswordChange}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="newPassword"
                                    label="Nueva Contraseña"
                                    type="password"
                                    value={passwordFormData.newPassword}
                                    onChange={handlePasswordChange}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmNewPassword"
                                    label="Confirmar Nueva Contraseña"
                                    type="password"
                                    value={passwordFormData.confirmNewPassword}
                                    onChange={handlePasswordChange}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={updateLoading}
                                    sx={{ mt: 2 }}
                                >
                                    {updateLoading ? <CircularProgress size={24} /> : 'Actualizar Contraseña'}
                                </Button>
                            </Box>
                        </Paper>

                        {/* Sección Eliminar Cuenta */}
                        <Paper elevation={2} sx={{ p: 3, mb: 4, borderColor: 'error.main', border: '1px solid' }}>
                            <Typography variant="h6" gutterBottom>Eliminar Cuenta</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Esta acción es irreversible. Al eliminar tu cuenta, perderás todos tus datos.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setDeleteConfirmOpen(true)}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? <CircularProgress size={24} /> : 'Eliminar Cuenta'}
                            </Button>
                        </Paper>

                        {/* Modal de Confirmación de Eliminación */}
                        <Dialog
                            open={deleteConfirmOpen}
                            onClose={() => setDeleteConfirmOpen(false)}
                        >
                            <DialogTitle>Confirmar Eliminación</DialogTitle>
                            <DialogContent>
                                <Typography>¿Está seguro de que desea eliminar su cuenta? Esta acción no se puede deshacer.</Typography>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
                                    Cancelar
                                </Button>
                                <Button onClick={handleDeleteAccount} color="error" disabled={deleteLoading}>
                                    {deleteLoading ? <CircularProgress size={24} /> : 'Eliminar'}
                                </Button>
                            </DialogActions>
                        </Dialog>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <DashboardBackgroundBox>
            <Container maxWidth="lg">
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1">Firma Electrónica</Typography>
                    </Box>

                    {/* Barra de Navegación (Tabs) */}
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard navigation">
                        <Tab label="Firmar" />
                        <Tab label="Subir Documento" />
                        <Tab label="Perfil" />
                    </Tabs>

                    {/* Área de Contenido de la Sección Activa */}
                    <Box sx={{ mt: 3 }}>
                        {renderContent()}
                    </Box>
                </Paper>
            </Container>
        </DashboardBackgroundBox>
    );
};

export default Dashboard; 