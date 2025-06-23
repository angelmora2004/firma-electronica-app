import React from 'react';
import { Box, Container, Paper, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Security, VerifiedUser } from '@mui/icons-material';

const BackgroundBox = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    minWidth: '100vw',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(0, 212, 170, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(0, 212, 170, 0.05) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        animation: 'pulse 4s ease-in-out infinite',
    },
    '@keyframes pulse': {
        '0%, 100%': {
            opacity: 0.5,
            transform: 'translate(-50%, -50%) scale(1)',
        },
        '50%': {
            opacity: 0.8,
            transform: 'translate(-50%, -50%) scale(1.1)',
        },
    },
    padding: theme.spacing(2)
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(26, 26, 26, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    position: 'relative',
    zIndex: 1,
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, transparent 50%)',
        borderRadius: '20px',
        zIndex: -1,
    }
}));

const Logo = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    '& .logo-icon': {
        fontSize: '2.5rem',
        color: theme.palette.primary.main,
    },
    '& .logo-text': {
        color: theme.palette.primary.main,
        fontWeight: 700,
        fontSize: '2rem',
        letterSpacing: '-0.5px',
    }
}));

const SecurityBadge = styled(Chip)(({ theme }) => ({
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    color: theme.palette.primary.main,
    border: `1px solid ${theme.palette.primary.main}`,
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    '& .MuiChip-icon': {
        color: theme.palette.primary.main,
    }
}));

const AuthLayout = ({ children, title }) => {
    return (
        <BackgroundBox>
            <Container maxWidth="sm">
                <StyledPaper elevation={0}>
                    <Logo>
                        <Security className="logo-icon" />
                        <Typography className="logo-text" component="h1">
                            SecureSign
                        </Typography>
                    </Logo>
                    
                    <SecurityBadge
                        icon={<VerifiedUser />}
                        label="Sistema de Firma Electrónica Seguro"
                        variant="outlined"
                    />
                    
                    <Typography 
                        component="h2" 
                        variant="h5" 
                        gutterBottom
                        sx={{ 
                            fontWeight: 600,
                            color: 'text.primary',
                            textAlign: 'center',
                            mb: 3
                        }}
                    >
                        {title}
                    </Typography>
                    {children}
                </StyledPaper>
            </Container>
        </BackgroundBox>
    );
};

export default AuthLayout; 