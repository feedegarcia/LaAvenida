import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';

export const usePedidoStore = defineStore('pedido', {
    state: () => ({
        estadosPedido: {
            BORRADOR: {
                label: 'Borrador',
                color: 'gray',
                siguientesEstados: ['EN_FABRICA'],
                acciones: [
                    {
                        estado: 'EN_FABRICA',
                        label: 'Confirmar Pedido',
                        requiereValidacion: true,
                        validaciones: ['tieneProductos']
                    }
                ],
                permisos: {
                    ver: 'SUCURSAL_ORIGEN',
                    modificar: 'SUCURSAL_ORIGEN'
                }
            },
            EN_FABRICA: {
                label: 'En Fabrica',
                color: 'blue',
                siguientesEstados: ['PREPARADO', 'EN_FABRICA_MODIFICADO', 'PREPARADO_MODIFICADO'],
                acciones: [
                    {
                        estado: 'PREPARADO',
                        label: 'Preparado',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        permiso: 'SUCURSAL_FABRICA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            },
            EN_FABRICA_MODIFICADO: {
                label: 'En Fabrica Modificado',
                color: 'yellow',
                siguientesEstados: ['PREPARADO', 'PREPARADO_MODIFICADO'],
                acciones: [
                    {
                        estado: 'PREPARADO',
                        label: 'Preparado',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        permiso: 'SUCURSAL_FABRICA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA']
                }
            },
            PREPARADO: {
                label: 'Preparado',
                color: 'green',
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Confirmar Recepción',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Recibir con Diferencias',
                        permiso: 'SUCURSAL_ORIGEN'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_ORIGEN'
                }
            },
            PREPARADO_MODIFICADO: {
                label: 'Preparado con Cambios',
                color: 'orange',
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Confirmar Recepción',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Recibir con Diferencias',
                        permiso: 'SUCURSAL_ORIGEN'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_ORIGEN'
                }
            },
            RECIBIDO: {
                label: 'Recibido',
                color: 'green',
                siguientesEstados: ['FINALIZADO'],
                acciones: [
                    {
                        estado: 'FINALIZADO',
                        label: 'Finalizar',
                        permiso: 'SISTEMA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: null
                }
            },
            RECIBIDO_CON_DIFERENCIAS: {
                label: 'Con Diferencias',
                color: 'red',
                siguientesEstados: ['FINALIZADO', 'EN_FABRICA_MODIFICADO'],
                acciones: [
                    {
                        estado: 'FINALIZADO',
                        label: 'Aprobar',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'EN_FABRICA_MODIFICADO',
                        label: 'Desaprobar con Cambios',
                        permiso: 'SUCURSAL_FABRICA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_FABRICA'
                }
            },
            FINALIZADO: {
                label: 'Finalizado',
                color: 'green',
                siguientesEstados: [],
                acciones: [],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'ADMIN'
                }
            },
            CANCELADO: {
                label: 'Cancelado',
                color: 'red',
                siguientesEstados: [],
                acciones: [],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: null
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
                if (sucursal.id === pedido.sucursal_origen) return true;
                if (sucursal.id === pedido.sucursal_destino) return true;
                return false;
            });
        },

        puedeModificarPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;

            if (['FINALIZADO', 'CANCELADO'].includes(pedido.estado)) {
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
        async verificarModificacionesSucursalDestino(pedidoId) {
            try {
                const response = await axios.get(`/api/pedidos/${pedidoId}/comparar-cambios`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                console.log('Verificando modificaciones:', {
                    pedidoId,
                    resultado: response.data
                });

                return response.data.modificado;
            } catch (error) {
                console.error('Error verificando modificaciones:', error);
                return false;
            }
        },

        async obtenerAccionesPermitidas(estado, usuario, pedido) {
            const estadoConfig = this.estadosPedido[estado];
            if (!estadoConfig?.acciones) return [];

            const usuarioEnSucursalDestino = usuario.sucursales.some(s => s.id === pedido.sucursal_destino);
            if (!usuarioEnSucursalDestino) return [];

            // Solo para estados EN_FABRICA y EN_FABRICA_MODIFICADO verificamos modificaciones
            if (['EN_FABRICA', 'EN_FABRICA_MODIFICADO'].includes(estado)) {
                const hayModificaciones = await this.verificarModificacionesSucursalDestino(pedido.pedido_id);

                return estadoConfig.acciones.map(accion => ({
                    ...accion,
                    estado: accion.estado,
                    label: accion.label,
                    habilitado: accion.estado === 'PREPARADO' ? !hayModificaciones : hayModificaciones
                }));
            }

            // Para otros estados, retornamos las acciones sin modificar
            return estadoConfig.acciones;
        },

        async cambiarEstadoPedido(pedidoId, estado, datos = {}) {
            try {
                console.log('Actualizando estado:', { pedidoId, estado, datos });

                const response = await axios.patch(
                    `/api/pedidos/${pedidoId}/estado`,
                    {
                        estado,
                        tieneCambios: await this.verificarModificacionesSucursalDestino(pedidoId),
                        ...datos
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error al actualizar estado:', error);
                throw error;
            }
        },

        async agregarProductoAPedido(pedidoId, producto) {
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

        async tieneCambios(pedidoId) {
            try {
                const response = await axios.get(`/api/pedidos/${pedidoId}/comparar-cambios`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return response.data.modificado;
            } catch (error) {
                console.error('Error al verificar cambios:', error);
                return false;
            }
        }
    }
});