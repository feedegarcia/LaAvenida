import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8'
    }
});

const activeControllers = new Map();

axiosInstance.interceptors.request.use(
    config => {
        const controller = activeControllers.get(config.url);
        if (controller) {
            controller.abort();
        }

        const newController = new AbortController();
        config.signal = newController.signal;
        activeControllers.set(config.url, newController);

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Asegurar que siempre enviamos y recibimos en UTF-8
        config.headers['Content-Type'] = 'application/json; charset=utf-8';
        config.headers['Accept'] = 'application/json; charset=utf-8';

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    response => {
        activeControllers.delete(response.config.url);
        return response;
    },
    error => {
        if (error.config) {
            activeControllers.delete(error.config.url);
        }

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

        if (error.name === 'AbortError') {
            return new Promise(() => { });
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;