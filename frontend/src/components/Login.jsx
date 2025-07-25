import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Link,
    Box,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
    Typography,
    Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from './AuthLayout';
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.main,
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
        },
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.7)',
        '&.Mui-focused': {
            color: theme.palette.primary.main,
        },
    },
    '& .MuiInputBase-input': {
        color: '#ffffff',
    },
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
}));

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowResend(false);
        setResendSuccess('');
        setLoading(true);

        try {
            const response = await login(email, password);
            if (response?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Error al iniciar sesión';
            setError(msg);
            if (msg.includes('Debes verificar tu correo')) {
                setShowResend(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setResendSuccess('');
        setError('');
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setResendSuccess(data.message || 'Correo de verificación reenviado. Revisa tu bandeja de entrada.');
            } else {
                setError(data.error || 'No se pudo reenviar el correo. Intenta más tarde.');
            }
        } catch (err) {
            setError('No se pudo reenviar el correo. Intenta más tarde.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <AuthLayout title="Acceso Seguro">
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 3,
                            backgroundColor: 'rgba(255, 71, 87, 0.1)',
                            border: '1px solid rgba(255, 71, 87, 0.3)',
                            color: '#ff4757'
                        }}
                    >
                        {error}
                        {showResend && (
                            <Box sx={{ mt: 2 }}>
                                <StyledButton
                                    variant="outlined"
                                    size="small"
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                >
                                    {resendLoading ? 'Enviando...' : 'Reenviar correo de verificación'}
                                </StyledButton>
                            </Box>
                        )}
                    </Alert>
                )}
                {resendSuccess && (
                    <Alert 
                        severity="success" 
                        sx={{ 
                            mb: 3,
                            backgroundColor: 'rgba(0, 212, 170, 0.1)',
                            border: '1px solid rgba(0, 212, 170, 0.3)',
                            color: '#00d4aa'
                        }}
                    >
                        {resendSuccess}
                    </Alert>
                )}
                
                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Correo Electrónico"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 2 }}
                />
                
                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 3 }}
                />

                <StyledButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                    sx={{
                        mt: 2,
                        mb: 3,
                        py: 1.5,
                    }}
                >
                    {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </StyledButton>

                <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        o
                    </Typography>
                </Divider>

                <Box sx={{ textAlign: 'center' }}>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate('/register')}
                        sx={{ 
                            textDecoration: 'none',
                            color: 'primary.main',
                            '&:hover': {
                                color: 'primary.light',
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        ¿No tienes una cuenta? Regístrate
                    </Link>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate('/recuperar')}
                        sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                            '&:hover': {
                                color: 'primary.light',
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                        Conexión segura con encriptación SSL
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
};

export default Login; 