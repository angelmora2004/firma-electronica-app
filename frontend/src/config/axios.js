import axios from 'axios';

if (!import.meta.env.VITE_API_URL) {
    throw new Error('La variable de entorno VITE_API_URL no está definida');
}

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000, // Aumentar timeout a 30 segundos para procesamiento de PDFs
    headers: {
        'Content-Type': 'application/json'
    }
});

// El interceptor se manejará desde el AuthContext
export default instance; 