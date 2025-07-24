import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    Typography
} from '@mui/material';
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

const VerifyResetCode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Código verificado. Redirigiendo...');
                setTimeout(() => {
                    navigate('/cambiar-contraseña', { state: { email, code } });
                }, 1500);
            } else {
                setError(data.error || 'Código incorrecto o expirado.');
            }
        } catch (err) {
            setError('No se pudo verificar el código.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Verificar Código de Recuperación">
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                    Ingresa el código de 6 dígitos que te enviamos a tu correo electrónico.
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
                    id="code"
                    label="Código de verificación"
                    name="code"
                    autoFocus
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    sx={{ mb: 3 }}
                />
                <StyledButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Verificar código'}
                </StyledButton>
            </Box>
        </AuthLayout>
    );
};

export default VerifyResetCode; 