import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket debe ser usado dentro de un SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        // Crear conexión Socket.io
        const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            // Configuración para certificados autofirmados en desarrollo
            rejectUnauthorized: import.meta.env.DEV ? false : true
        });

        // Eventos de conexión
        newSocket.on('connect', () => {
            console.log('Socket conectado:', newSocket.id);
            setIsConnected(true);
            
            // Registrar el usuario
            newSocket.emit('register', user.id);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket desconectado');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Error de conexión Socket:', error);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('Socket reconectado después de', attemptNumber, 'intentos');
            setIsConnected(true);
            
            // Re-registrar el usuario después de reconexión
            newSocket.emit('register', user.id);
        });

        setSocket(newSocket);

        // Cleanup al desmontar
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [user?.id]);

    const value = {
        socket,
        isConnected,
        emit: (event, data) => {
            if (socket && isConnected) {
                socket.emit(event, data);
            }
        },
        on: (event, callback) => {
            if (socket) {
                socket.on(event, callback);
            }
        },
        off: (event, callback) => {
            if (socket) {
                socket.off(event, callback);
            }
        }
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}; 