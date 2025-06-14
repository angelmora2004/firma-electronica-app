import axios from 'axios';

if (!import.meta.env.VITE_API_URL) {
    throw new Error('La variable de entorno VITE_API_URL no está definida');
}

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// El interceptor se manejará desde el AuthContext
export default instance; 