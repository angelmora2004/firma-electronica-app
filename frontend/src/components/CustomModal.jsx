import React from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    Paper
} from '@mui/material';
import { ErrorOutline, CheckCircleOutline, WarningAmberOutlined } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme, type }) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: '2px solid',
    borderColor: type === 'error' ? theme.palette.error.main : (type === 'success' ? theme.palette.success.main : theme.palette.warning.main),
    boxShadow: 24,
    padding: theme.spacing(4),
    borderRadius: theme.shape.borderRadius,
    textAlign: 'center',
}));

const IconWrapper = styled(Box)(({ theme, type }) => ({
    fontSize: '4rem',
    marginBottom: theme.spacing(2),
    color: type === 'error' ? theme.palette.error.main : (type === 'success' ? theme.palette.success.main : theme.palette.warning.main),
    '& .MuiSvgIcon-root': {
        fontSize: 'inherit'
    }
}));

const getIcon = (type) => {
    switch (type) {
        case 'error':
            return <ErrorOutline />;
        case 'success':
            return <CheckCircleOutline />;
        case 'warning':
            return <WarningAmberOutlined />;
        default:
            return null;
    }
};

const CustomModal = ({ open, onClose, handleClose, title, message, type = 'error', children }) => {
    // Permitir onClose o handleClose para compatibilidad
    const closeFn = onClose || handleClose;
    return (
        <Modal
            open={open}
            onClose={closeFn}
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
        >
            {children ? (
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: 1,
                    boxShadow: 'none',
                  }}
                >
                  {children}
                </Box>
            ) : (
                <StyledPaper type={type}>
                    <IconWrapper type={type}>
                        {getIcon(type)}
                    </IconWrapper>
                    <Typography id="modal-title" variant="h6" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                        {title}
                    </Typography>
                    <Typography id="modal-message" sx={{ mb: 4, color: 'text.secondary' }}>
                        {message}
                    </Typography>
                    <Button onClick={closeFn} variant="contained" fullWidth>
                        Entendido
                    </Button>
                </StyledPaper>
            )}
        </Modal>
    );
};

export default CustomModal; 