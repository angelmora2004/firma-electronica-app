import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    Typography,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import AuthLayout from './AuthLayout';
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)'
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.main
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main
        }
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.7)',
        '&.Mui-focused': {
            color: theme.palette.primary.main
        }
    },
    '& .MuiInputBase-input': {
        color: '#ffffff'
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
        transform: 'translateY(-2px)'
    },
    transition: 'all 0.3s ease'
}));

const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/~`]).{6,}$/.test(password);
};

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';
    const code = location.state?.code || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (!isStrongPassword(password)) {
            setError('La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un carácter especial.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword: password })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(data.message || 'Contraseña actualizada correctamente.');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(data.error || 'No se pudo cambiar la contraseña.');
            }
        } catch (err) {
            setError('No se pudo cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Cambiar Contraseña">
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                    Ingresa tu nueva contraseña.
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>
                )}
                <StyledTextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Nueva contraseña"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
                    label="Confirmar nueva contraseña"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Cambiar contraseña'}
                </StyledButton>
            </Box>
        </AuthLayout>
    );
};

export default ResetPassword; 