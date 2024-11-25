import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';

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

        obtenerFabricaDestino() {
            for (const [productoId] of Object.entries(this.pedido.detalles)) {
                for (const [fabricaId, fabrica] of Object.entries(this.productos.fabricas || {})) {
                    for (const subcategoria of Object.values(fabrica.subcategorias || {})) {
                        if (subcategoria.productos?.some(p => p.producto_id === parseInt(productoId))) {
                            return parseInt(fabricaId);
                        }
                    }
                }
            }
            return null;
        },

        async confirmarPedido() {
            try {
                if (!this.pedido.sucursal_origen) {
                    throw new Error('Debe seleccionar una sucursal de origen');
                }

                if (!this.tieneProductosSeleccionados) {
                    throw new Error('Debe seleccionar al menos un producto');
                }

                const pedidosPorFabrica = new Map();

                for (const [productoId, detalle] of Object.entries(this.pedido.detalles)) {
                    const resultado = this.encontrarProductoYFabrica(productoId);
                    if (!resultado) {
                        console.error(`Producto no encontrado: ${productoId}`);
                        continue;
                    }

                    const { producto, fabricaId } = resultado;

                    if (!pedidosPorFabrica.has(fabricaId)) {
                        pedidosPorFabrica.set(fabricaId, {
                            sucursal_origen: this.pedido.sucursal_origen,
                            sucursal_destino: fabricaId,
                            fecha_entrega_requerida: this.formatearFechaParaMySQL(this.pedido.fecha_entrega_requerida),
                            tipo: 'PEDIDO_FABRICA',
                            detalles: [],
                            notas: this.pedido.notas || ''
                        });
                    }

                    const pedidoFabrica = pedidosPorFabrica.get(fabricaId);
                    pedidoFabrica.detalles.push({
                        producto_id: parseInt(productoId),
                        cantidad: detalle.cantidad,
                        precio_unitario: parseFloat(producto.precio_mayorista)
                    });
                }

                const resultados = [];
                for (const [fabricaId, pedidoData] of pedidosPorFabrica) {
                    try {
                        const response = await axios.post('/api/pedidos', pedidoData);
                        resultados.push({
                            fabrica: fabricaId,
                            resultado: response.data,
                            estado: 'éxito'
                        });
                    } catch (error) {
                        resultados.push({
                            fabrica: fabricaId,
                            error: error.message,
                            estado: 'error'
                        });
                    }
                }

                const errores = resultados.filter(r => r.estado === 'error');
                if (errores.length > 0) {
                    throw new Error(`Error al crear pedidos para ${errores.length} fábricas: ${errores.map(e => e.error).join(', ')}`);
                }

                return {
                    mensaje: `Se crearon ${resultados.length} pedidos exitosamente`,
                    pedidos: resultados
                };
            } catch (error) {
                console.error('Error detallado:', error);
                throw error;
            }
        },

        encontrarProductoYFabrica(productoId) {
            for (const [fabricaId, fabrica] of Object.entries(this.productos.fabricas || {})) {
                for (const subcategoria of Object.values(fabrica.subcategorias || {})) {
                    const producto = subcategoria.productos?.find(p => p.producto_id === parseInt(productoId));
                    if (producto) {
                        return {
                            producto,
                            fabricaId: parseInt(fabricaId)
                        };
                    }
                }
            }

            const productoSinTac = (this.productos.sinTac || [])
                .find(p => p.producto_id === parseInt(productoId));
            if (productoSinTac) {
                return {
                    producto: productoSinTac,
                    fabricaId: productoSinTac.sucursal_fabricante_id
                };
            }

            return null;
        },

        formatearFechaParaMySQL(fecha) {
            if (!fecha) return null;
            const d = new Date(fecha);
            return d.toISOString().slice(0, 19).replace('T', ' ');
        },

        async guardarBorrador() {
            try {
                if (!this.tieneProductosSeleccionados) {
                    throw new Error('Debe seleccionar al menos un producto');
                }

                const response = await axios.post('/api/pedidos', {
                    ...this.pedido,
                    estado: 'BORRADOR'
                });

                return response.data;
            } catch (error) {
                console.error('Error al guardar borrador:', error);
                throw error;
            }
        },

        resetear() {
            this.$reset();
        }
    }
});
