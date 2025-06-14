import React, { createContext, useContext, useState } from 'react';
import axios from '../config/axios';

const AuthContext = createContext(null);

// Función de validación de email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Configurar el interceptor de axios para usar el token en memoria
    React.useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                setError('Error de conexión');
                return Promise.reject(error);
            }
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    setUser(null);
                    setToken(null);
                    window.location.href = '/login';
                } else if (error.code === 'ECONNABORTED') {
                    setError('La conexión ha expirado');
                } else if (!error.response) {
                    setError('Error de conexión con el servidor');
                } else {
                    setError(error.response.data?.error || 'Ha ocurrido un error');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    const login = async (email, password) => {
        try {
            setError(null);
            setLoading(true);

            if (!isValidEmail(email)) {
                throw new Error('Email inválido');
            }

            const response = await axios.post('/auth/login', {
                email,
                password
            });
            setUser(response.data.user);
            setToken(response.data.token);
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Error al iniciar sesión';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password) => {
        try {
            setError(null);
            setLoading(true);

            if (!isValidEmail(email)) {
                throw new Error('Email inválido');
            }

            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            const response = await axios.post('/auth/register', {
                nombre: name,
                email,
                password
            });
            setUser(response.data.user);
            setToken(response.data.token);
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Error al registrar usuario';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setError(null);
    };

    const value = {
        user,
        token,
        loading,
        error,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

export default AuthContext; 