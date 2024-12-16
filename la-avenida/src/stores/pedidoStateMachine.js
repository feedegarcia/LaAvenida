import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';

export const usePedidoStore = defineStore('pedido', {
    state: () => ({
        sucursalActiva: null,
        rolEnPedido: null,
        pedidoBloqueado: false,
        ultimaModificacion: null,

        estadosPedido: {
            EN_FABRICA: {
                label: 'En Fabrica',
                color: 'blue',
                siguientesEstados: ['PREPARADO', 'EN_FABRICA_MODIFICADO', 'PREPARADO_MODIFICADO'],
                acciones: {
                    ORIGEN: ['MODIFICAR', 'AGREGAR', 'ELIMINAR'],
                    FABRICA: ['PREPARAR', 'MODIFICAR', 'AGREGAR', 'ELIMINAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            },
            EN_FABRICA_MODIFICADO: {
                label: 'En Fabrica Modificado',
                color: 'yellow',
                siguientesEstados: ['PREPARADO', 'PREPARADO_MODIFICADO'],
                acciones: {
                    ORIGEN: ['MODIFICAR', 'AGREGAR', 'ELIMINAR'],
                    FABRICA: ['PREPARAR', 'MODIFICAR', 'AGREGAR', 'ELIMINAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            },
            PREPARADO: {
                label: 'Preparado',
                color: 'green',
                siguientesEstados: ['FINALIZADO', 'RECIBIDO_CON_DIFERENCIAS'], // Cambiado: de RECIBIDO a FINALIZADO
                acciones: {
                    ORIGEN: ['RECIBIR', 'MODIFICAR', 'AGREGAR', 'ELIMINAR'],
                    FABRICA: ['VISUALIZAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_ORIGEN'
                }
            },
            PREPARADO_MODIFICADO: {
                label: 'Preparado con Cambios',
                color: 'orange',
                siguientesEstados: ['FINALIZADO', 'RECIBIDO_CON_DIFERENCIAS'], // Cambiado: de RECIBIDO a FINALIZADO
                acciones: {
                    ORIGEN: ['RECIBIR', 'MODIFICAR', 'AGREGAR', 'ELIMINAR'],
                    FABRICA: ['MODIFICAR', 'AGREGAR', 'ELIMINAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            },
            RECIBIDO_CON_DIFERENCIAS: {
                label: 'Con Diferencias',
                color: 'red',
                siguientesEstados: ['FINALIZADO', 'EN_FABRICA_MODIFICADO'],
                acciones: {
                    ORIGEN: ['VISUALIZAR'],
                    FABRICA: ['APROBAR', 'RECHAZAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_FABRICA'
                }
            },
            FINALIZADO: {
                label: 'Finalizado',
                color: 'green',
                siguientesEstados: [],
                acciones: {
                    ORIGEN: ['VISUALIZAR'],
                    FABRICA: ['VISUALIZAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'ADMIN'
                }
            },
            BORRADOR: {
                label: 'Borrador',
                color: 'gray',
                siguientesEstados: ['EN_FABRICA'],
                acciones: {
                    ORIGEN: ['MODIFICAR', 'AGREGAR', 'ELIMINAR', 'CONFIRMAR'],
                    FABRICA: ['MODIFICAR', 'AGREGAR', 'ELIMINAR', 'CONFIRMAR']
                },
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            }
        }
    }),

    getters: {
        obtenerEtiquetaEstado: (state) => (estado) => {
            return state.estadosPedido[estado]?.label || estado;
        },

        obtenerColorEstado: (state) => (estado) => {
            return state.estadosPedido[estado]?.color || 'gray';
        },

        puedeVerPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            const estadoConfig = state.estadosPedido[pedido.estado];
            if (!estadoConfig?.permisos?.ver) return false;

            return usuario.sucursales.some(sucursal => {
                const esSucursalOrigen = sucursal.id === pedido.sucursal_origen;
                const esSucursalFabrica = sucursal.id === pedido.sucursal_destino;

                return estadoConfig.permisos.ver.includes('SUCURSAL_ORIGEN') && esSucursalOrigen ||
                    estadoConfig.permisos.ver.includes('SUCURSAL_FABRICA') && esSucursalFabrica;
            });
        },

        puedeModificarPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;

            // Nuevo: Verificar si el pedido está finalizado
            if (pedido.estado === 'FINALIZADO') {
                return usuario.rol === 'ADMIN';
            }

            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            const estadoConfig = state.estadosPedido[pedido.estado];
            if (!estadoConfig?.permisos?.modificar) return false;

            const permisos = Array.isArray(estadoConfig.permisos.modificar)
                ? estadoConfig.permisos.modificar
                : [estadoConfig.permisos.modificar];

            return permisos.some(permiso => {
                if (permiso === 'SUCURSAL_ORIGEN') {
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
                }
                if (permiso === 'SUCURSAL_FABRICA') {
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_destino);
                }
                return false;
            });
        },

        puedeCancelarPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;
            if (usuario.rol !== 'ADMIN') return false;
            return !['FINALIZADO', 'CANCELADO'].includes(pedido.estado);
        },

        puedeVerTotales: (state) => (pedido, usuario) => {
            return ['ADMIN', 'DUEÑO'].includes(usuario.rol);
        }
    },

    actions: {
        setContexto(sucursalId, pedido) {
            console.log('Estableciendo contexto:', {
                sucursalId,
                pedido
            });

            this.sucursalActiva = sucursalId;

            if (!pedido) {
                this.rolEnPedido = null;
                return;
            }

            if (sucursalId === pedido.sucursal_origen) {
                this.rolEnPedido = 'ORIGEN';
            } else if (sucursalId === pedido.sucursal_destino) {
                this.rolEnPedido = 'FABRICA';
            } else {
                this.rolEnPedido = null;
            }

            console.log('Contexto establecido:', {
                sucursalActiva: this.sucursalActiva,
                rolEnPedido: this.rolEnPedido
            });
        },

        async modificarCantidadProducto(pedidoId, detalleId, cantidad) {
            if (this.pedido?.estado === 'FINALIZADO') {
                throw new Error('No se puede modificar un pedido finalizado');
            }

            try {
                const response = await axios.patch(
                    `/api/pedidos/${pedidoId}/productos/${detalleId}`,
                    { cantidad },
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error al modificar cantidad:', error);
                throw error;
            }
        },

        async eliminarProducto(pedidoId, detalleId) {
            if (this.pedido?.estado === 'FINALIZADO') {
                throw new Error('No se puede eliminar productos de un pedido finalizado');
            }

            try {
                const response = await axios.delete(
                    `/api/pedidos/${pedidoId}/productos/${detalleId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                throw error;
            }
        },

        async agregarProducto(pedidoId, producto) {
            if (this.pedido?.estado === 'FINALIZADO') {
                throw new Error('No se pueden agregar productos a un pedido finalizado');
            }

            try {
                const response = await axios.post(
                    `/api/pedidos/${pedidoId}/productos`,
                    producto,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error al agregar producto:', error);
                throw error;
            }
        },

        async obtenerAccionesPermitidas(estado, usuario, pedido) {
            // Sucursal origen en EN_FABRICA
            if (this.rolEnPedido === 'FABRICA' && ['EN_FABRICA', 'EN_FABRICA_MODIFICADO'].includes(estado)) {
                // Solo verificamos si la fábrica hizo modificaciones
                const hayModificacionesFabrica = await this.verificarModificacionesSucursalDestino(pedido.pedido_id);

                return [{
                    accion: 'PREPARAR',
                    estado: hayModificacionesFabrica ? 'PREPARADO_MODIFICADO' : 'PREPARADO',
                    habilitado: true,
                    label: hayModificacionesFabrica ? 'Preparar con Modificaciones' : 'Preparar'
                }];
            }

            // Sucursal fabrica en EN_FABRICA/EN_FABRICA_MODIFICADO
            if (this.rolEnPedido === 'FABRICA' && ['EN_FABRICA', 'EN_FABRICA_MODIFICADO'].includes(estado)) {
                const hayModificaciones = await this.verificarModificacionesSucursalDestino(pedido.pedido_id);

                return [{
                    accion: 'PREPARAR',
                    estado: hayModificaciones ? 'PREPARADO_MODIFICADO' : 'PREPARADO',
                    habilitado: true,
                    label: hayModificaciones ? 'Preparado con Modificaciones' : 'Preparado'
                }];
            }

            // Sucursal origen en PREPARADO/PREPARADO_MODIFICADO
            if (this.rolEnPedido === 'ORIGEN' && ['PREPARADO', 'PREPARADO_MODIFICADO'].includes(estado)) {
                return [{
                    accion: 'RECIBIR',
                    estado: 'FINALIZADO', // Cambiado: ahora va directo a FINALIZADO
                    habilitado: true,
                    label: 'Finalizado'
                }, {
                    accion: 'RECIBIR_DIFERENCIAS',
                    estado: 'RECIBIDO_CON_DIFERENCIAS',
                    habilitado: true,
                    label: 'Con Diferencias'
                }];
            }

            // Sucursal fabrica en RECIBIDO_CON_DIFERENCIAS
            if (this.rolEnPedido === 'FABRICA' && estado === 'RECIBIDO_CON_DIFERENCIAS') {
                return [{
                    accion: 'APROBAR',
                    estado: 'FINALIZADO',
                    habilitado: true,
                    label: 'Aprobar'
                }, {
                    accion: 'RECHAZAR',
                    estado: 'EN_FABRICA_MODIFICADO',
                    habilitado: true,
                    label: 'Rechazar'
                }];
            }

            return [];
        },

        async tieneCambios(pedidoId) {
            try {
                const response = await axios.get(`/api/pedidos/${pedidoId}/comparar-cambios`);
                return response.data.modificado;
            } catch (error) {
                console.error('Error al verificar cambios:', error);
                return false;
            }
        },

        obtenerSiguienteEstado(estadoActual, accion, hayModificaciones) {
            const mapping = {
                PREPARAR: hayModificaciones ? 'PREPARADO_MODIFICADO' : 'PREPARADO',
                RECIBIR: 'FINALIZADO', // Cambiado: ahora va directo a FINALIZADO
                APROBAR: 'FINALIZADO',
                RECHAZAR: 'EN_FABRICA_MODIFICADO'
            };
            return mapping[accion] || estadoActual;
        },

        async verificarModificacionesSucursalDestino(pedidoId) {
            try {
                const response = await axios.get(`/api/pedidos/${pedidoId}/comparar-cambios`);
                return response.data.modificado;
            } catch (error) {
                if (error.name !== 'CanceledError') {
                    console.error('Error verificando modificaciones:', error);
                }
                return false;
            }
        },

        async cambiarEstadoPedido(pedidoId, estado) {
            try {
                console.log('Intentando cambiar estado:', {
                    pedidoId,
                    estado,
                    sucursalActiva: this.sucursalActiva
                });

                const response = await axios.patch(
                    `/api/pedidos/${pedidoId}/estado`,
                    {
                        estado,
                        sucursalId: this.sucursalActiva
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error detallado al actualizar estado:', error.response?.data);
                throw error;
            }
        }
    }
});