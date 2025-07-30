import React, { useState, useEffect } from 'react';
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
    Tab,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Chip,
    Avatar,
    Divider,
    Alert,
    AppBar,
    Toolbar,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Badge,
    useMediaQuery
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
    Dashboard as DashboardIcon,
    Description,
    Security,
    Person,
    Logout,
    Menu,
    Notifications,
    Settings,
    Upload,
    Download,
    VerifiedUser,
    Warning,
    CheckCircle,
    Schedule,
    Lock,
    Visibility,
    VisibilityOff,
    Draw,
    Article,
    AccessTime,
    SmartToy,
    VpnKey,
    Close,
    AddCard,
    Send,
} from '@mui/icons-material';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import FileUpload from './FileUpload';
import AddSignature from './AddSignature';
import UserCertificate from './UserCertificate';
import CustomModal from './CustomModal';
import SignedDocuments from './SignedDocuments';
import SendForSignature from './SendForSignature';
import SignatureRequests from './SignatureRequests';

const DashboardContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(0, 212, 170, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
    }
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: 'none',
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
    '& .MuiDrawer-paper': {
        background: 'rgba(26, 26, 26, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        width: 280,
        color: '#ffffff',
    }
}));

const StyledCard = styled(Card)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
        borderColor: 'rgba(0, 212, 170, 0.3)',
    }
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
    '& .MuiTabs-indicator': {
        backgroundColor: theme.palette.primary.main,
        height: 3,
        borderRadius: 2,
    },
    '& .MuiTab-root': {
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: 600,
        textTransform: 'none',
        fontSize: '1rem',
        '&.Mui-selected': {
            color: theme.palette.primary.main,
        },
    }
}));

const ActionCard = styled(Card)(({ theme }) => ({
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    transition: 'all 0.3s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
    textAlign: 'center',
    cursor: 'pointer',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
        borderColor: 'rgba(0, 212, 170, 0.5)',
    }
}));

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [signatures, setSignatures] = useState([]);
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' });
    
    // Estados para el modal de descarga
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState(null);
    const [downloadPassword, setDownloadPassword] = useState('');
    const [showDownloadPassword, setShowDownloadPassword] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadError, setDownloadError] = useState('');

    // Estados para el modal de certificado digital
    const [certModalOpen, setCertModalOpen] = useState(false);

    // Estados para las notificaciones
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState('');
    const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);

    // Estados para el modal de error de descarga
    const [downloadErrorModal, setDownloadErrorModal] = useState(false);
    const [downloadErrorMsg, setDownloadErrorMsg] = useState('');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const fetchSignatures = async () => {
        try {
            const { data } = await axios.get('/signatures');
            setSignatures(data);
        } catch (error) {
            console.error('Error fetching signatures:', error);
            // Opcional: mostrar un mensaje de error al usuario
        }
    };

    const fetchNotifications = async () => {
        setNotifLoading(true);
        setNotifError('');
        try {
            const { data } = await axios.get('/auth/notifications?all=true');
            setNotifications(data);
        } catch (error) {
            setNotifError('Error al obtener notificaciones');
        } finally {
            setNotifLoading(false);
        }
    };

    // Marcar notificación como leída
    const markNotificationAsRead = async (notificationId) => {
        try {
            await axios.put(`/auth/notifications/${notificationId}/read`);
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, leido: true }
                        : notif
                )
            );
        } catch (error) {
            console.error('Error al marcar notificación como leída:', error);
        }
    };

    // Marcar todas las notificaciones como leídas
    const markAllNotificationsAsRead = async () => {
        try {
            await axios.put('/auth/notifications/read-all');
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, leido: true }))
            );
        } catch (error) {
            console.error('Error al marcar todas las notificaciones como leídas:', error);
        }
    };

    // Eliminar notificación
    const deleteNotification = async (notificationId) => {
        try {
            await axios.delete(`/auth/notifications/${notificationId}`);
            setNotifications(prev => 
                prev.filter(notif => notif.id !== notificationId)
            );
        } catch (error) {
            console.error('Error al eliminar notificación:', error);
        }
    };

    const { socket, on, isConnected } = useSocket();

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 60000);
        
        // Cargar las firmas cuando el componente se monta
        fetchSignatures();
        fetchNotifications();

        // Escuchar notificaciones en tiempo real
        on('nuevaNotificacion', (notif) => {
            setNotifications((prev) => [notif, ...prev]);
        });

        return () => {
            clearInterval(timerId);
        };
    }, [user?.id, on]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handlePasswordChange = (e) => {
        setPasswordFormData({
            ...passwordFormData,
            [e.target.name]: e.target.value
        });
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords({
            ...showPasswords,
            [field]: !showPasswords[field]
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
            await axios.put('/auth/profile', {
                currentPassword: passwordFormData.currentPassword,
                newPassword: passwordFormData.newPassword
            });
            setUpdateMessage({ text: 'Contraseña actualizada con éxito', type: 'success' });
            setPasswordFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
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
            await axios.delete('/auth/me');
            logout();
        } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            alert(error.response?.data?.message || 'Error al eliminar cuenta');
            setDeleteLoading(false);
            setDeleteConfirmOpen(false);
        }
    };

    const handleDownloadSignature = (signature) => {
        setSelectedSignature(signature);
        setDownloadPassword('');
        setDownloadError('');
        setDownloadModalOpen(true);
    };

    const handleDownloadConfirm = async () => {
        if (!downloadPassword.trim()) {
            setDownloadError('Por favor ingresa la contraseña de la firma');
            return;
        }

        setDownloadLoading(true);
        setDownloadError('');

        try {
            // Primero validar la contraseña
            await axios.post(`/signatures/${selectedSignature.id}/unlock`, {
                password: downloadPassword
            });

            // Si la contraseña es correcta, descargar la firma
            const response = await axios.get(`/signatures/${selectedSignature.id}/download`, {
                responseType: 'blob',
                params: { password: downloadPassword }
            });

            // Crear el enlace de descarga
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', selectedSignature.fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            // Cerrar el modal
            setDownloadModalOpen(false);
            setDownloadPassword('');
            setSelectedSignature(null);

        } catch (error) {
            console.error('Error al descargar firma:', error);
            if (error.response?.status === 401) {
                setDownloadError('Contraseña incorrecta');
            } else {
                setDownloadError('Error al descargar la firma. Inténtalo de nuevo.');
            }
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleDownloadCancel = () => {
        setDownloadModalOpen(false);
        setDownloadPassword('');
        setDownloadError('');
        setSelectedSignature(null);
    };

    const handleDownloadP12 = async (notif) => {
        try {
            // Usar POST seguro con username y email
            const response = await axios.post(
                '/ca/download-p12',
                { username: user.nombre, email: user.email },
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${user.nombre}.p12`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            // Eliminar la notificación aprobada del estado
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
        } catch (error) {
            setDownloadErrorMsg(
                error.response?.data?.message ||
                'Error al descargar el archivo .p12. Si ya descargaste el archivo, la contraseña fue eliminada por seguridad.'
            );
            setDownloadErrorModal(true);
        }
    };

    const unreadCount = notifications.filter(n => !n.leido).length;

    if (!user) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    const renderSettings = () => (
        <>
            {updateMessage.text && (
                <Alert 
                    severity={updateMessage.type} 
                    sx={{ mb: 3 }}
                    variant="filled"
                >
                    {updateMessage.text}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <StyledCard>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                Información de la Cuenta
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">Nombre</Typography>
                                <Typography variant="body1">{user.nombre}</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">Correo Electrónico</Typography>
                                <Typography variant="body1">{user.email}</Typography>
                            </Box>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="body2" color="text.secondary">Estado de Verificación</Typography>
                                <Chip 
                                    icon={<VerifiedUser />} 
                                    label="Verificado" 
                                    color="success" 
                                    size="small" 
                                />
                            </Box>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={logout}
                                startIcon={<Logout />}
                                fullWidth
                            >
                                Cerrar Sesión
                            </Button>
                        </CardContent>
                    </StyledCard>
                </Grid>

                <Grid item xs={12}>
                    <StyledCard>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                Cambiar Contraseña
                            </Typography>
                            <Box component="form" onSubmit={handleUpdatePassword}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="currentPassword"
                                    label="Contraseña Actual"
                                    type={showPasswords.current ? 'text' : 'password'}
                                    value={passwordFormData.currentPassword}
                                    onChange={handlePasswordChange}
                                    InputProps={{
                                        endAdornment: (
                                            <IconButton
                                                onClick={() => togglePasswordVisibility('current')}
                                                edge="end"
                                            >
                                                {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="newPassword"
                                    label="Nueva Contraseña"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={passwordFormData.newPassword}
                                    onChange={handlePasswordChange}
                                    InputProps={{
                                        endAdornment: (
                                            <IconButton
                                                onClick={() => togglePasswordVisibility('new')}
                                                edge="end"
                                            >
                                                {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmNewPassword"
                                    label="Confirmar Nueva Contraseña"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={passwordFormData.confirmNewPassword}
                                    onChange={handlePasswordChange}
                                    InputProps={{
                                        endAdornment: (
                                            <IconButton
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                edge="end"
                                            >
                                                {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={updateLoading}
                                    startIcon={updateLoading ? <CircularProgress size={20} /> : <Lock />}
                                    fullWidth
                                >
                                    {updateLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </Button>
                            </Box>
                        </CardContent>
                    </StyledCard>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <StyledCard sx={{ borderColor: 'error.main' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                            <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Eliminar Cuenta
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Esta acción es irreversible. Al eliminar tu cuenta, perderás todos tus datos y documentos firmados.
                        </Typography>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setDeleteConfirmOpen(true)}
                            startIcon={<Warning />}
                        >
                            Eliminar Cuenta
                        </Button>
                    </CardContent>
                </StyledCard>
            </Box>
        </>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 0:
                return (
                    <Box sx={{ p: isMobile ? 1 : 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                background: 'rgba(26, 26, 26, 0.7)',
                                padding: 3,
                                borderRadius: 4,
                                mb: 4
                            }}
                        >
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    Bienvenido/a, {user.nombre}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccessTime sx={{ mr: 1, fontSize: '1rem' }} />
                                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Box>
                            {!isMobile && <SmartToy sx={{ fontSize: 80, color: 'primary.main', opacity: 0.8 }} />}
                        </Box>

                        <Grid container spacing={3} mb={5}>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setActiveTab(1)}>
                                    <Draw sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Añadir mi firma (P12)</Typography>
                                </ActionCard>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setActiveTab(2)}>
                                    <Article sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Firmar Documentos</Typography>
                                </ActionCard>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setActiveTab(3)}>
                                    <Article sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Documentos Firmados</Typography>
                                </ActionCard>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setActiveTab(4)}>
                                    <Send sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Enviar para Firma</Typography>
                                </ActionCard>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setActiveTab(5)}>
                                    <Download sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Solicitudes de Firma</Typography>
                                </ActionCard>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <ActionCard onClick={() => setCertModalOpen(true)}>
                                    <VerifiedUser sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Solicitar Certificado Digital</Typography>
                                </ActionCard>
                            </Grid>
                        </Grid>
                        
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                            Mis Firmas
                        </Typography>
                        <StyledCard>
                            <CardContent>
                                <List>
                                    {signatures.length > 0 ? (
                                        signatures.map((sig, index) => (
                                            <React.Fragment key={sig.id}>
                                                <ListItem
                                                    secondaryAction={
                                                        <Button 
                                                            variant="contained" 
                                                            size="small"
                                                            startIcon={<Download />}
                                                            onClick={() => handleDownloadSignature(sig)}
                                                        >
                                                            Descargar
                                                        </Button>
                                                    }
                                                >
                                                    <ListItemIcon>
                                                        <VpnKey color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={sig.fileName} secondary={`Agregada: ${new Date(sig.createdAt).toLocaleDateString()}`} />
                                                </ListItem>
                                                {index < signatures.length - 1 && <Divider variant="inset" component="li" />}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <Typography sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>
                                            No has añadido ninguna firma todavía.
                                        </Typography>
                                    )}
                                </List>
                            </CardContent>
                        </StyledCard>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ p: 3 }}>
                        <AddSignature onSignatureAdded={fetchSignatures} />
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
                            Firmar Documento
                        </Typography>
                        <FileUpload />
                    </Box>
                );
            case 3:
                return (
                    <Box sx={{ p: 3 }}>
                        <SignedDocuments />
                    </Box>
                );
            case 4:
                return (
                    <Box sx={{ p: 3 }}>
                        <SendForSignature />
                    </Box>
                );
            case 5:
                return (
                    <Box sx={{ p: 3 }}>
                        <SignatureRequests />
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <DashboardContainer>
            <StyledAppBar position="fixed">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => setDrawerOpen(true)}
                        sx={{ mr: 2 }}
                    >
                        <Menu />
                    </IconButton>
                    
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        SecureSign
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                        {/* En el AppBar, envuelve el Badge y el IconButton en un Box clickable para que ambos abran el Drawer */}
                        <Box onClick={() => setNotifDrawerOpen(true)} sx={{ cursor: 'pointer' }}>
                            <IconButton color="inherit">
                                <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error">
                                    <Notifications />
                                </Badge>
                            </IconButton>
                        </Box>
                        <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {user.nombre?.charAt(0) || 'U'}
                            </Avatar>
                        </IconButton>
                    </Box>
                </Toolbar>
            </StyledAppBar>

            <StyledDrawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        SecureSign
                    </Typography>
                </Box>
                <List>
                    <ListItem button onClick={() => { setActiveTab(0); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <DashboardIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Panel de Control" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(1); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Draw color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Añadir mi Firma" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(2); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Article color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Firmar Documento" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(3); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Article color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Documentos Firmados" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(4); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Send color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Enviar para Firma" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(5); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Download color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Solicitudes de Firma" />
                    </ListItem>
                    <ListItem button onClick={() => { setActiveTab(6); setDrawerOpen(false); }}>
                        <ListItemIcon>
                            <Notifications color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Notificaciones" />
                    </ListItem>
                </List>
            </StyledDrawer>

            <Drawer
                anchor="right"
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            >
                <Box sx={{ width: isMobile ? '100vw' : 400, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5" sx={{ fontWeight: 700, ml: 2 }}>
                            Configuración
                        </Typography>
                        <IconButton onClick={() => setSettingsOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ p: 2, overflowY: 'auto', height: 'calc(100vh - 100px)' }}>
                         {renderSettings()}
                    </Box>
                </Box>
            </Drawer>

            <Box sx={{ pt: 8, pb: 3 }}>
                <Container maxWidth="xl">
                    <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }}>
                        <StyledTabs value={activeTab} onChange={handleTabChange}>
                            <Tab label="Panel de Control" />
                            <Tab label="Añadir mi Firma" />
                            <Tab label="Firmar Documento" />
                            <Tab label="Documentos Firmados" />
                            <Tab label="Enviar para Firma" />
                            <Tab label="Solicitudes de Firma" />
                        </StyledTabs>
                    </Box>
                    
                    {renderContent()}
                </Container>
            </Box>

            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleDeleteAccount} 
                        color="error" 
                        variant="contained"
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? <CircularProgress size={20} /> : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal para descargar firma */}
            <Dialog 
                open={downloadModalOpen} 
                onClose={handleDownloadCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Download color="primary" />
                    Descargar Firma
                </DialogTitle>
                <DialogContent>
                    {selectedSignature && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Archivo:</strong> {selectedSignature.fileName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Para descargar esta firma, ingresa la contraseña que usaste al subirla.
                            </Typography>
                        </Box>
                    )}
                    
                    {downloadError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {downloadError}
                        </Alert>
                    )}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Contraseña de la firma"
                        type={showDownloadPassword ? 'text' : 'password'}
                        fullWidth
                        variant="outlined"
                        value={downloadPassword}
                        onChange={(e) => setDownloadPassword(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <IconButton
                                    onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                                    edge="end"
                                >
                                    {showDownloadPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            ),
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleDownloadConfirm();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDownloadCancel} disabled={downloadLoading}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleDownloadConfirm} 
                        variant="contained"
                        disabled={downloadLoading || !downloadPassword.trim()}
                        startIcon={downloadLoading ? <CircularProgress size={20} /> : <Download />}
                    >
                        {downloadLoading ? 'Descargando...' : 'Descargar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal para solicitar certificado digital */}
            <CustomModal open={certModalOpen} onClose={() => setCertModalOpen(false)} title="Solicitar Certificado Digital">
                <UserCertificate />
            </CustomModal>

            {/* Drawer lateral para notificaciones */}
            <Drawer
                anchor="right"
                open={notifDrawerOpen}
                onClose={() => setNotifDrawerOpen(false)}
            >
                <Box sx={{ width: 420, p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Notificaciones
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    if (notifications.some(n => !n.leido)) {
                                        markAllNotificationsAsRead();
                                    } else {
                                        setShowAllNotifications(!showAllNotifications);
                                    }
                                }}
                                sx={{ 
                                    fontSize: '0.7rem',
                                    minWidth: 'auto',
                                    px: 1,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {notifications.some(n => !n.leido) 
                                    ? 'Marcar leídas' 
                                    : (showAllNotifications ? 'Solo no leídas' : 'Mostrar todas')
                                }
                            </Button>
                            <Chip
                                size="small"
                                label={isConnected ? "Conectado" : "Desconectado"}
                                color={isConnected ? "success" : "error"}
                                variant="outlined"
                            />
                            <IconButton onClick={() => setNotifDrawerOpen(false)}>
                                <Close />
                            </IconButton>
                        </Box>
                    </Box>
                    {notifLoading ? (
                        <CircularProgress />
                    ) : notifError ? (
                        <Alert severity="error">{notifError}</Alert>
                    ) : notifications.length === 0 ? (
                        <Typography color="text.secondary">No tienes notificaciones.</Typography>
                    ) : (
                        <>
                            {!showAllNotifications && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Mostrando solo notificaciones no leídas
                                </Typography>
                            )}
                            <List>
                                {notifications
                                    .filter(notif => showAllNotifications || !notif.leido)
                                    .map((notif) => (
                                <React.Fragment key={notif.id}>
                                    <ListItem
                                        alignItems="flex-start"
                                        sx={{ mb: 2, background: notif.leido ? 'transparent' : notif.tipo === 'aprobada' ? 'rgba(0, 212, 170, 0.13)' : 'rgba(255,0,0,0.07)', borderRadius: 2, position: 'relative' }}
                                        onClick={() => {
                                            if (!notif.leido) {
                                                markNotificationAsRead(notif.id);
                                            }
                                        }}
                                    >
                                        <ListItemIcon>
                                            {notif.tipo === 'aprobada' ? <CheckCircle color="success" /> : <Warning color="error" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Typography sx={{ fontWeight: notif.leido ? 400 : 700 }}>{notif.mensaje}</Typography>}
                                            secondary={
                                                <>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(notif.createdAt).toLocaleString()}
                                                    </Typography>
                                                    {notif.tipo === 'rechazada' && notif.adminComment && (
                                                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                                            Motivo: {notif.adminComment}
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                        />
                                        <IconButton
                                            size="small"
                                            sx={{ position: 'absolute', top: 8, right: 8 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notif.id);
                                            }}
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                        {notif.tipo === 'aprobada' && notif.link && (
                                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 1 }}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    startIcon={<Download />}
                                                    onClick={() => handleDownloadP12(notif)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        fontWeight: 700,
                                                        px: 2,
                                                        py: 0.5,
                                                        fontSize: '0.95rem',
                                                        minWidth: 120,
                                                        boxShadow: '0 2px 8px rgba(0,212,170,0.13)'
                                                    }}
                                                >
                                                    Descargar .p12
                                                </Button>
                                            </Box>
                                        )}
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                        </>
                    )}
                </Box>
            </Drawer>

            {/* Modal de error de descarga */}
            <Dialog open={downloadErrorModal} onClose={() => setDownloadErrorModal(false)}>
                <DialogTitle>Error al descargar</DialogTitle>
                <DialogContent>
                    <Typography>{downloadErrorMsg}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDownloadErrorModal(false)} color="primary" autoFocus>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardContainer>
    );
};

export default Dashboard; 