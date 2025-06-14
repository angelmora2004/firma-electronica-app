import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const BackgroundBox = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    minWidth: '100vw',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
    padding: theme.spacing(2)
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
}));

const Logo = styled(Typography)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    fontSize: '2rem'
}));

const AuthLayout = ({ children, title }) => {
    return (
        <BackgroundBox>
            <Container maxWidth="sm">
                <StyledPaper elevation={3}>
                    <Logo variant="h4" component="h1">
                        Firma Electrónica
                    </Logo>
                    <Typography component="h2" variant="h5" gutterBottom>
                        {title}
                    </Typography>
                    {children}
                </StyledPaper>
            </Container>
        </BackgroundBox>
    );
};

export default AuthLayout; 