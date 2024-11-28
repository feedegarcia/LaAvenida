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
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        activadoSi: 'tieneCambios',
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
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'PREPARADO_MODIFICADO',
                        label: 'Preparado con Modificaciones',
                        activadoSi: 'tieneCambios',
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
                        label: 'Confirmar Recepcion',
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_ORIGEN'
                    },
                    {
                        estado: 'RECIBIDO_CON_DIFERENCIAS',
                        label: 'Recibir con Diferencias',
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
                        label: 'Recibir con Diferencias',
                        activadoSi: 'tieneCambios',
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
                        desactivadoSi: 'tieneCambios',
                        permiso: 'SUCURSAL_FABRICA'
                    },
                    {
                        estado: 'EN_FABRICA_MODIFICADO',
                        label: 'Desaprobar con Cambios',
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

            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) {
                return true;
            }

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

        obtenerAccionesPermitidas: (state) => (estado, usuario, pedido) => {
            const estadoConfig = state.estadosPedido[estado];
            if (!estadoConfig?.acciones) return [];

            // Admin/Dueño pueden ver todas las acciones excepto en estados finales
            const esAdminODueno = ['ADMIN', 'DUEÑO'].includes(usuario.rol);
            if (esAdminODueno && !['FINALIZADO', 'CANCELADO'].includes(estado)) {
                return estadoConfig.acciones;
            }

            // Verificar permisos según sucursal
            const usuarioEnSucursalOrigen = usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            const usuarioEnSucursalDestino = usuario.sucursales.some(s => s.id === pedido.sucursal_destino);

            return estadoConfig.acciones.filter(accion => {
                // Verificar permisos básicos
                if (accion.permiso === 'SISTEMA') return true;
                if (accion.permiso === 'SUCURSAL_ORIGEN' && !usuarioEnSucursalOrigen) return false;
                if (accion.permiso === 'SUCURSAL_FABRICA' && !usuarioEnSucursalDestino) return false;

                // Verificar estado actual y restricciones
                const puedeEjecutar = state.estadosPedido[estado].siguientesEstados.includes(accion.estado);
                if (!puedeEjecutar) return false;

                // Si la acción es preparado, solo la sucursal destino puede ejecutarla
                if (accion.estado === 'PREPARADO' && !usuarioEnSucursalDestino) return false;

                // Si la acción es recibir, solo la sucursal origen puede ejecutarla
                if (['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'].includes(accion.estado) && !usuarioEnSucursalOrigen) return false;

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

        async tieneCambios(pedidoId) {
            try {
                const response = await axios.get(`/api/pedidos/${pedidoId}/comparar-cambios`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                console.log('tieneCambios response:', response.data);
                return response.data.modificado;
            } catch (error) {
                console.error('Error al verificar cambios:', error);
                return false;
            }
        },

        async agregarProductoAPedido(pedidoId, producto) {
            try {
                console.log('Store - Agregando producto:', { pedidoId, producto });
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
                console.error('Store - Error:', error);
                throw error;
            }
        },

        async validarCambioEstado(estado, nuevoEstado, usuario, pedido) {
            // Verificar si el estado actual permite la transición
            const estadoConfig = this.estadosPedido[estado];
            if (!estadoConfig?.siguientesEstados?.includes(nuevoEstado)) {
                throw new Error(`Transicion no permitida de ${estado} a ${nuevoEstado}`);
            }

            // Verificar permisos del usuario
            const usuarioEnSucursalOrigen = usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            const usuarioEnSucursalDestino = usuario.sucursales.some(s => s.id === pedido.sucursal_destino);

            if (nuevoEstado === 'PREPARADO' || nuevoEstado === 'PREPARADO_MODIFICADO') {
                if (!usuarioEnSucursalDestino) {
                    throw new Error('Solo la sucursal fabrica puede marcar como preparado');
                }
            }

            if (['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'].includes(nuevoEstado)) {
                if (!usuarioEnSucursalOrigen) {
                    throw new Error('Solo la sucursal origen puede recibir el pedido');
                }
            }

            return true;
        },

        // Modificar cambiarEstadoPedido para usar la nueva validación
        async cambiarEstadoPedido(pedidoId, estado, datos = {}) {
            try {
                console.log('Store - Actualizando estado:', { pedidoId, estado, datos });

                // Verificar si hay cambios cuando es necesario
                if (['PREPARADO', 'PREPARADO_MODIFICADO'].includes(estado)) {
                    const tieneCambios = await this.tieneCambios(pedidoId);
                    // Si hay cambios, forzar PREPARADO_MODIFICADO
                    if (tieneCambios && estado === 'PREPARADO') {
                        estado = 'PREPARADO_MODIFICADO';
                    }
                }

                const response = await axios.patch(
                    `/api/pedidos/${pedidoId}/estado`,
                    {
                        estado,
                        tieneCambios: await this.tieneCambios(pedidoId),
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
        }
    }
});