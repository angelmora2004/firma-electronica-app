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
import { Visibility, VisibilityOff, PersonAdd, Security } from '@mui/icons-material';
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

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            await register(formData.name, formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Crear Cuenta Segura">
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
                    </Alert>
                )}

                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    id="name"
                    label="Nombre Completo"
                    name="name"
                    autoComplete="name"
                    autoFocus
                    value={formData.name}
                    onChange={handleChange}
                    sx={{ mb: 2 }}
                />

                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Correo Electrónico"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
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
                    sx={{ mb: 2 }}
                />

                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirmar Contraseña"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle confirm password visibility"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                    sx={{
                        mt: 2,
                        mb: 3,
                        py: 1.5,
                    }}
                >
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
                        onClick={() => navigate('/login')}
                        sx={{ 
                            textDecoration: 'none',
                            color: 'primary.main',
                            '&:hover': {
                                color: 'primary.light',
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        ¿Ya tienes una cuenta? Inicia sesión
                    </Link>
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                        Tus datos están protegidos con encriptación de nivel bancario
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
};

export default Register;