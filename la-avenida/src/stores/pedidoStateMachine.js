import { defineStore } from 'pinia';
import axios from '@/utils/axios-config';

export const usePedidoStore = defineStore('pedido', {
    state: () => ({
        estadosPedido: {
            EN_FABRICA: {
                label: 'En Fabrica',
                color: 'blue',
                siguientesEstados: ['PREPARADO', 'PREPARADO_MODIFICADO', 'EN_FABRICA_MODIFICADO'],
                acciones: [
                    // Acciones para sucursal origen
                    {
                        estado: 'EN_FABRICA_MODIFICADO',
                        label: 'Confirmar Modificaciones',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    // Acciones para sucursal destino
                    {
                        estado: 'PREPARADO',
                        label: 'Preparado',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_DESTINO'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_DESTINO'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO']
                }
            },

            EN_FABRICA_MODIFICADO: {
                label: 'Modificado por Sucursal',
                color: 'yellow',
                siguientesEstados: ['PREPARADO', 'PREPARADO_MODIFICADO'],
                acciones: [
                    {
                        estado: 'PREPARADO',
                        label: 'Preparado',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_DESTINO'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_DESTINO'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: ['SUCURSAL_DESTINO']
                }
            },

            PREPARADO: {
                label: 'Preparado',
                color: 'green',
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Confirmar Recepcion',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Recibido con Diferencias',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO']
                }
            },

            PREPARADO_MODIFICADO: {
                label: 'Preparado con Modificaciones',
                color: 'orange',
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                acciones: [
                    {
                        estado: 'RECIBIDO',
                        label: 'Confirmar Recepcion',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Recibido con Diferencias',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO']
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
                        permiso: 'SUCURSAL_DESTINO'
                    },
                    {
                        estado: 'EN_FABRICA_MODIFICADO',
                        label: 'Desaprobar con Cambios',
                        activadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_DESTINO'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: ['SUCURSAL_DESTINO']
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
                        permiso: 'SUCURSAL_DESTINO'
                    }
                ],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: null
                }
            },

            FINALIZADO: {
                label: 'Finalizado',
                color: 'green',
                siguientesEstados: [],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
                    modificar: 'ADMIN'
                }
            },

            CANCELADO: {
                label: 'Cancelado',
                color: 'red',
                siguientesEstados: [],
                permisos: {
                    ver: ['SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO'],
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
                if (sucursal.id === pedido.sucursal_destino) return true;
                return false;
            });
        },

        puedeModificarPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;

            if (['FINALIZADO', 'CANCELADO'].includes(pedido.estado)) {
                return ['ADMIN', 'DUEÑO'].includes(usuario.rol);
            }

            const estadoConfig = state.estadosPedido[pedido.estado];
            if (!estadoConfig?.permisos?.modificar) return false;

            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            const permisos = estadoConfig.permisos.modificar;
            const usuarioEnSucursalOrigen = usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            const usuarioEnSucursalDestino = usuario.sucursales.some(s => s.id === pedido.sucursal_destino);

            if (Array.isArray(permisos)) {
                return permisos.some(permiso => {
                    if (permiso === 'SUCURSAL_ORIGEN') return usuarioEnSucursalOrigen;
                    if (permiso === 'SUCURSAL_DESTINO') return usuarioEnSucursalDestino;
                    return false;
                });
            }

            return permisos === 'ADMIN' && ['ADMIN', 'DUEÑO'].includes(usuario.rol);
        },

        puedeVerTotales: () => (pedido, usuario) => {
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) {
                return true;
            }

            const usuarioEnSucursalOrigen = usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            return usuarioEnSucursalOrigen && ['FINALIZADO', 'RECIBIDO'].includes(pedido.estado);
        },

        puedeCancelarPedido: () => (pedido, usuario) => {
            return ['ADMIN', 'DUEÑO'].includes(usuario.rol) &&
                !['FINALIZADO', 'CANCELADO'].includes(pedido.estado);
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