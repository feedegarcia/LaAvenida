import { defineStore } from 'pinia';
import axios from 'axios';

export const useEventosStore = defineStore('eventos', {
    state: () => ({
        eventos: [],
        feriados: [],
        loading: false,
        error: null
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

        feriadosPorFecha: (state) => (fecha) => {
            const fechaObj = new Date(fecha);
            return state.feriados.filter(feriado => {
                const feriadoFecha = new Date(feriado.fecha);
                return feriadoFecha.toDateString() === fechaObj.toDateString();
            });
        },

        tieneEventos: (state) => (fecha) => {
            return state.eventosPorFecha(fecha).length > 0 || state.feriadosPorFecha(fecha).length > 0;
        }
    },

    actions: {
        async cargarEventos() {
            try {
                this.loading = true;
                const response = await axios.get('http://localhost:3000/api/eventos', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                this.eventos = response.data;
            } catch (error) {
                this.error = 'Error al cargar eventos';
                console.error('Error:', error);
            } finally {
                this.loading = false;
            }
        },

        async cargarFeriados() {
            try {
                this.loading = true;
                const response = await axios.get('http://localhost:3000/api/feriados', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                this.feriados = response.data;
            } catch (error) {
                this.error = 'Error al cargar feriados';
                console.error('Error:', error);
            } finally {
                this.loading = false;
            }
        },

        async inicializar() {
            await Promise.all([
                this.cargarEventos(),
                this.cargarFeriados()
            ]);
        }
    }
});
