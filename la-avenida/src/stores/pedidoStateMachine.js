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
                siguientesEstados: ['PREPARADO', 'EN_FABRICA_MODIFICADO'],
                acciones: [
                    {
                        estado: 'PREPARADO',
                        label: 'Preparado',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'EN_FABRICA_MODIFICADO',
                        label: 'Preparado Modificado',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_FABRICA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_FABRICA'
                }
            },
            EN_FABRICA_MODIFICADO: {
                label: 'Modificado en Fabrica',
                color: 'yellow',
                siguientesEstados: ['PREPARADO'],
                acciones: [
                    {
                        estado: 'PREPARADO',
                        label: 'Confirmar Modificacion',
                        permiso: 'SUCURSAL_FABRICA'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_FABRICA'
                }
            },
            PREPARADO: {
                label: 'Preparado',
                color: 'green',
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Recibido',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Con Diferencias',
                        activadoSi: 'tieneCambios',
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
                siguientesEstados: ['RECIBIDO'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Confirmar Recepcion',
                        permiso: 'SUCURSAL_ORIGEN'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'SUCURSAL_ORIGEN'
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
                        label: 'Desaprobar',
                        activadoSi: 'tieneCambios',
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
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: 'ADMIN'
                }
            },
            CANCELADO: {
                label: 'Cancelado',
                color: 'red',
                siguientesEstados: [],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_FABRICA'],
                    modificar: null
                }
            }
        }
    }),

    getters: {
        puedeVerPedido: (state) => (pedido, usuario) => {
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            const estadoConfig = state.estadosPedido[pedido.estado];
            if (!estadoConfig?.permisos?.ver) return false;

            return usuario.sucursales.some(sucursal => {
                if (sucursal.id === pedido.sucursal_origen) return true;
                if (sucursal.id === pedido.sucursal_destino &&
                    pedido.sucursal_destino === pedido.fabrica_id) return true;
                return false;
            });
        },

        puedeModificarPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;

            if (usuario.rol === 'ADMIN') {
                return pedido.estado !== 'CANCELADO';
            }

            const estadoConfig = state.estadosPedido[pedido.estado];
            if (!estadoConfig?.permisos?.modificar) return false;

            const permisoRequerido = estadoConfig.permisos.modificar;

            return usuario.sucursales.some(sucursal => {
                switch (permisoRequerido) {
                    case 'SUCURSAL_ORIGEN':
                        return sucursal.id === pedido.sucursal_origen;
                    case 'SUCURSAL_FABRICA':
                        return sucursal.id === pedido.sucursal_destino;
                    default:
                        return false;
                }
            });
        },

        obtenerAccionesPermitidas: (state) => (estado, usuario, pedido) => {
            const estadoConfig = state.estadosPedido[estado];
            if (!estadoConfig?.acciones) return [];

            return estadoConfig.acciones.filter(accion => {
                if (usuario.rol === 'ADMIN' && !['FINALIZADO', 'CANCELADO'].includes(estado)) {
                    return true;
                }

                const tienePermiso = usuario.sucursales.some(sucursal => {
                    switch (accion.permiso) {
                        case 'SUCURSAL_ORIGEN':
                            return sucursal.id === pedido.sucursal_origen;
                        case 'SUCURSAL_FABRICA':
                            return sucursal.id === pedido.sucursal_destino;
                        default:
                            return false;
                    }
                });

                if (!tienePermiso) return false;

                if (accion.desactivadoSi === 'tieneCambios') {
                    return !pedido.detalles?.some(d => d.modificado);
                }
                if (accion.activadoSi === 'tieneCambios') {
                    return pedido.detalles?.some(d => d.modificado);
                }

                return true;
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
        obtenerEtiquetaEstado(estado) {
            return this.estadosPedido[estado]?.label || estado;
        },

        obtenerColorEstado(estado) {
            return this.estadosPedido[estado]?.color || 'gray';
        },

        async cambiarEstadoPedido(pedidoId, nuevoEstado, datos = {}) {
            try {
                const response = await axios.patch(`/api/pedidos/${pedidoId}/estado`, {
                    estado: nuevoEstado,
                    ...datos
                });
                return response.data;
            } catch (error) {
                console.error('Error al cambiar estado:', error);
                throw error;
            }
        }
    }
});