import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import AuthLayout from './AuthLayout';

const VerifyEmail = () => {
    const [status, setStatus] = useState('pending'); // 'pending', 'success', 'error'
    const [message, setMessage] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Token de verificación faltante.');
            return;
        }
        fetch(`/api/auth/verify-email?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.message) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Error al verificar el correo.');
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('Error al verificar el correo.');
            });
    }, [location.search]);

    return (
        <AuthLayout title="Verificación de Correo Electrónico">
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                {status === 'pending' && <CircularProgress color="primary" />}
                {status !== 'pending' && (
                    <Alert severity={status === 'success' ? 'success' : 'error'} sx={{ mb: 3, fontSize: '1.1rem' }}>
                        {message}
                    </Alert>
                )}
                {status === 'success' && (
                    <Button variant="contained" color="primary" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
                        Ir a Iniciar Sesión
                    </Button>
                )}
            </Box>
        </AuthLayout>
    );
};

export default VerifyEmail; 