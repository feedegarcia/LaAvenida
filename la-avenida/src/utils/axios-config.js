// src/utils/axios-config.js

import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Crear instancia de axios con configuración base
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000'
});

// Interceptor para agregar el token a todas las peticiones
axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de respuesta
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        const token = localStorage.getItem('token');

        if (error.response?.status === 401 || error.response?.status === 403) {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp < currentTime) {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }
                } catch (e) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;