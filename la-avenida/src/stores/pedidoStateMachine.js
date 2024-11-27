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
                        label: 'Preparado con Modificaciones',
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
                        label: 'Confirmar Modificaciones',
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
                        label: 'Confirmar Recepción',
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
                        label: 'Confirmar Recepción',
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

            if (estadoConfig.permisos.modificar === 'SUCURSAL_ORIGEN') {
                return usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            }

            if (estadoConfig.permisos.modificar === 'SUCURSAL_FABRICA') {
                return usuario.sucursales.some(s => s.id === pedido.sucursal_destino);
            }

            return false;
        },

        obtenerAccionesPermitidas: (state) => (estado, usuario, pedido) => {
            const estadoConfig = state.estadosPedido[estado];
            if (!estadoConfig?.acciones) return [];

            const esAdminODueno = ['ADMIN', 'DUEÑO'].includes(usuario.rol);
            if (esAdminODueno && !['FINALIZADO', 'CANCELADO'].includes(estado)) {
                return estadoConfig.acciones;
            }

            const usuarioEnSucursalOrigen = usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            const usuarioEnSucursalDestino = usuario.sucursales.some(s => s.id === pedido.sucursal_destino);

            return estadoConfig.acciones.filter(accion => {
                if (accion.permiso === 'SISTEMA') return true;
                if (accion.permiso === 'SUCURSAL_ORIGEN') return usuarioEnSucursalOrigen;
                if (accion.permiso === 'SUCURSAL_FABRICA') return usuarioEnSucursalDestino;
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
        obtenerEtiquetaEstado(estado) {
            return this.estadosPedido[estado]?.label || estado;
        },

        obtenerColorEstado(estado) {
            return this.estadosPedido[estado]?.color || 'gray';
        },

        async agregarProductoAPedido(pedidoId, producto) {
            try {
                console.log('Datos a enviar:', { pedidoId, producto }); // Debug
                const response = await axios.post(
                    `/api/pedidos/${pedidoId}/productos`,
                    {
                        productos: [{
                            producto_id: producto.producto_id,
                            cantidad: producto.cantidad,
                            precio_unitario: producto.precio_unitario
                        }],
                        sucursal_id: producto.sucursal_id
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                return response.data;
            } catch (error) {
                console.error('Error detallado:', error.response?.data);
                throw error;
            }
        },  
        async cambiarEstadoPedido(pedidoId, nuevoEstado, datos = {}) {
            try {
                const response = await axios.patch(`/api/pedidos/${pedidoId}/estado`, {
                    estado: nuevoEstado,
                    ...datos
                });

                // Si el estado es RECIBIDO, automáticamente cambiamos a FINALIZADO
                if (nuevoEstado === 'RECIBIDO') {
                    await axios.patch(`/api/pedidos/${pedidoId}/estado`, {
                        estado: 'FINALIZADO'
                    });
                    return { estado: 'FINALIZADO' };
                }

                return response.data;
            } catch (error) {
                console.error('Error al cambiar estado:', error);
                throw error;
            }
        }
    }
});