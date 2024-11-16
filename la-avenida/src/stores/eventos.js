import { defineStore } from 'pinia';
import axios from 'axios';

export const useEventosStore = defineStore('eventos', {
    state: () => ({
        eventos: [],
        loading: false,
        error: null,
        lastUpdate: null
    }),

    getters: {
        eventosPorFecha: (state) => (fecha) => {
            const fechaObj = new Date(fecha);
            return state.eventos.filter(evento => {
                const inicio = new Date(evento.fecha_inicio);
                const fin = new Date(evento.fecha_fin);
                return fechaObj >= inicio && fechaObj <= fin;
            });
        },

        tieneEventos: (state) => (fecha) => {
            return state.eventosPorFecha(fecha).length > 0;
        }
    },

    actions: {
        async cargarEventos() {
            try {
                this.loading = true;
                const response = await axios.get('/api/eventos', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                this.eventos = response.data;
                this.lastUpdate = new Date();
            } catch (error) {
                this.error = 'Error al cargar eventos';
                console.error('Error:', error);
            } finally {
                this.loading = false;
            }
        },

        async inicializar() {
            await this.cargarEventos();
        }
    }
});