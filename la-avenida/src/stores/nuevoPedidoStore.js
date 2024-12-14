import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';
import { useAuthStore } from '@/stores/auth';

export const useNuevoPedidoStore = defineStore('nuevoPedido', {
    state: () => ({
        pedido: {
            fecha_entrega_requerida: null,
            sucursal_origen: null,
            sucursal_destino: null,
            notas: '',
            detalles: {}
        },
        productos: {
            fabricas: {},
            sinTac: [],
            varios: []
        }, 
        cargando: false,
        error: null,
        modo: 'NUEVO',
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
        async inicializarPedido(modo = 'NUEVO', borrador = null, sucursalInicial = null) {
            try {
                this.cargando = true;
                this.modo = modo;
                this.error = null;

                // Si es nuevo pedido, inicializar con valores por defecto
                if (modo === 'NUEVO') {
                    const fechaInicial = this.obtenerProximaFechaEntrega();

                    this.pedido = {
                        fecha_entrega_requerida: fechaInicial,
                        sucursal_origen: sucursalInicial,
                        sucursal_destino: null,
                        notas: '',
                        detalles: {}
                    };

                    // Si tenemos sucursal inicial, obtenemos sucursal destino y cargamos productos
                    if (sucursalInicial) {
                        this.obtenerSucursalDestinoDefault();
                        try {
                            await this.cargarProductos();
                        } catch (error) {
                            if (error.name !== 'CanceledError') {
                                console.error('Error cargando productos:', error);
                            }
                        }
                    }
                }
                // Si es borrador, cargar datos del borrador
                else if (borrador && modo === 'BORRADOR') {
                    const response = await axios.get(`/api/pedidos/${borrador}`);
                    const pedidoBorrador = response.data;

                    this.pedido = {
                        fecha_entrega_requerida: new Date(pedidoBorrador.fecha_entrega_requerida),
                        sucursal_origen: pedidoBorrador.sucursal_origen,
                        sucursal_destino: pedidoBorrador.sucursal_destino,
                        notas: pedidoBorrador.notas || '',
                        detalles: pedidoBorrador.detalles.reduce((acc, detalle) => {
                            acc[detalle.producto_id] = {
                                cantidad: detalle.cantidad_solicitada,
                                fecha_actualizacion: new Date()
                            };
                            return acc;
                        }, {})
                    };
                }
            } catch (error) {
                console.error('Error al inicializar pedido:', error);
                this.error = 'Error al inicializar pedido';
            } finally {
                this.cargando = false;
            }
        },

        async cargarProductos() {
            if (this.cargando) return;

            try {
                this.cargando = true;
                this.error = null;

                const response = await axios.get('/api/productos/pedido', {
                    params: {
                        sucursal_id: this.pedido.sucursal_origen
                    }
                });

                this.productos = {
                    fabricas: response.data.fabricas || {},
                    sinTac: response.data.sinTac || [],
                    varios: response.data.varios || []
                };
            } catch (error) {
                if (error.name !== 'CanceledError') {
                    console.error('Error en cargarProductos:', error);
                    this.error = 'Error al cargar productos';
                }
            } finally {
                this.cargando = false;
            }
        }, 
        resetear() {
            this.cargando = false; 
            this.$reset();
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
        obtenerSucursalDestinoDefault() {
            if (!this.pedido.sucursal_origen) return null;

            const authStore = useAuthStore();
            const sucursalOrigen = authStore.user.sucursales.find(s => s.id === this.pedido.sucursal_origen);

            if (sucursalOrigen?.tipo === 'FABRICA_VENTA') {
                const otraFabrica = authStore.user.sucursales.find(s =>
                    s.tipo === 'FABRICA_VENTA' && s.id !== sucursalOrigen.id
                );
                if (otraFabrica) {
                    this.pedido.sucursal_destino = otraFabrica.id;
                    return otraFabrica.id;
                }
            }

            return null;
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
                            estado: 'exito'
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
                    throw new Error(`Error al crear pedidos para ${errores.length} fabricas: ${errores.map(e => e.error).join(', ')}`);
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
