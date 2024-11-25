// src/utils/axios-config.js

import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Crear instancia de axios con configuración base
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000'
});

// Mapa para almacenar controllers activos
const activeControllers = new Map();

// Interceptor para agregar el token a todas las peticiones
axiosInstance.interceptors.request.use(
    config => {
        // Cancelar request anterior con la misma URL si existe
        const controller = activeControllers.get(config.url);
        if (controller) {
            controller.abort();
        }

        // Crear nuevo controller para esta request
        const newController = new AbortController();
        config.signal = newController.signal;
        activeControllers.set(config.url, newController);

        // Agregar token de autorización
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

// Interceptor para manejar respuestas y errores
axiosInstance.interceptors.response.use(
    response => {
        // Limpiar controller al completar exitosamente
        activeControllers.delete(response.config.url);
        return response;
    },
    error => {
        // Limpiar controller en caso de error
        if (error.config) {
            activeControllers.delete(error.config.url);
        }

        // Manejar error de token expirado
        if (error.response?.status === 401 || error.response?.status === 403) {
            const token = localStorage.getItem('token');
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

        // No rechazar errores de abort ya que son esperados
        if (error.name === 'AbortError') {
            return new Promise(() => { });
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;