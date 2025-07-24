import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(data.message || 'Si el correo está registrado, recibirás un código de recuperación.');
                setTimeout(() => {
                    navigate('/verificar-codigo', { state: { email } });
                }, 2000);
            } else {
                setError(data.error || 'No se pudo enviar el código.');
            }
        } catch (err) {
            setError('No se pudo enviar el código.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Recuperar Contraseña">
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                    Ingresa tu correo electrónico y te enviaremos un código para recuperar tu contraseña.
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
                    id="email"
                    label="Correo Electrónico"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    sx={{ mb: 3 }}
                />
                <StyledButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Enviar código'}
                </StyledButton>
            </Box>
        </AuthLayout>
    );
};

export default ForgotPassword; 