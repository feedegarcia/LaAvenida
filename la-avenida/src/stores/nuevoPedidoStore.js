import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';
import { usePedidoStore } from './pedidoStateMachine';

export const useNuevoPedidoStore = defineStore('nuevoPedido', {
    state: () => ({
        pedido: {
            fecha_entrega_requerida: null,
            sucursal_origen: null,
            sucursal_destino: null,
            notas: '',
            detalles: {}
        },
        productos: null,
        cargando: false,
        error: null,
        modo: 'NUEVO'
    }),

    getters: {
        tieneProductosSeleccionados: (state) => {
            return Object.keys(state.pedido.detalles || {}).length > 0;
        },

        totalPedido: (state) => {
            if (!state.productos || !state.pedido.detalles) return 0;

            const productosArray = Array.isArray(state.productos) ?
                state.productos : Object.values(state.productos.fabricas || {}).flatMap(f =>
                    Object.values(f.subcategorias || {}).flatMap(s => s.productos || [])
                );

            return Object.entries(state.pedido.detalles).reduce((total, [productoId, detalle]) => {
                const producto = productosArray.find(p => p.producto_id === parseInt(productoId));
                if (!producto || !detalle.cantidad) return total;
                return total + (producto.precio_mayorista * detalle.cantidad);
            }, 0);
        },

        productosPorFabrica: (state) => {
            if (!state.productos) return {};
            return state.productos;
        }
    },

    actions: {
        async inicializarPedido(modo = 'NUEVO', borrador = null) {
            try {
                this.cargando = true;
                this.modo = modo;
                this.error = null;

                if (borrador) {
                    this.pedido = this.convertirBorradorAPedido(borrador);
                } else {
                    this.pedido.fecha_entrega_requerida = this.obtenerProximaFechaEntrega();
                }

                await this.cargarProductos();
            } catch (error) {
                console.error('Error al inicializar pedido:', error);
                this.error = 'Error al inicializar pedido';
            } finally {
                this.cargando = false;
            }
        },

        async cargarProductos() {
            try {
                const response = await axios.get('/api/productos/pedido');
                this.productos = response.data || [];
                console.log('Productos cargados:', this.productos);
            } catch (error) {
                console.error('Error al cargar productos:', error);
                this.error = 'Error al cargar productos';
                this.productos = null;
            }
        },

        actualizarCantidad(productoId, cantidad) {
            if (cantidad <= 0) {
                delete this.pedido.detalles[productoId];
            } else {
                this.pedido.detalles[productoId] = {
                    cantidad,
                    fecha_actualizacion: new Date()
                };
            }
        },

        obtenerProximaFechaEntrega() {
            const hoy = new Date();
            let fecha = new Date(hoy);

            if (hoy.getHours() >= 11) {
                fecha.setDate(fecha.getDate() + 1);
            }

            while (fecha.getDay() !== 3 && fecha.getDay() !== 6) {
                fecha.setDate(fecha.getDate() + 1);
            }

            fecha.setHours(0, 0, 0, 0);
            return fecha;
        },

        resetear() {
            this.$reset();
        }
    }
});