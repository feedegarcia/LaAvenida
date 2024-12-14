<<<<<<< Updated upstream
// src/stores/pedidoStateMachine.js
=======
// Parte 1: state y getters del pedidoStateMachine.js
>>>>>>> Stashed changes

import { defineStore } from 'pinia';

export const usePedidoStore = defineStore('pedido', {
    state: () => ({
<<<<<<< Updated upstream
=======
        sucursalActiva: null,
        rolEnPedido: null,
        pedidoBloqueado: false,
        ultimaModificacion: null,

>>>>>>> Stashed changes
        estadosPedido: {
            BORRADOR: {
                siguientesEstados: ['EN_FABRICA', 'CANCELADO'],
                permisos: ['CREAR_PEDIDO', 'CANCELAR_PEDIDO'],
                roles: ['EMPLEADO', 'ADMIN', 'DUEÑO'],
                label: 'Borrador',
                color: 'gray',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    CANCELAR: 'ORIGEN',
                    VER: 'ORIGEN'
                }
            },
            EN_FABRICA: {
                siguientesEstados: ['PREPARADO', 'EN_FABRICA_MODIFICADO', 'CANCELADO'],
                permisos: ['MODIFICAR_PEDIDO', 'CANCELAR_PEDIDO'],
                roles: ['FABRICA', 'ADMIN', 'DUEÑO'],
                label: 'En Fábrica',
                color: 'blue',
                permisosEspeciales: {
                    MODIFICAR: 'DESTINO',
                    CANCELAR: 'ORIGEN',
                    VER: 'AMBOS'
                }
            },
            EN_FABRICA_MODIFICADO: {
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                permisos: ['ACEPTAR_MODIFICACION', 'REPORTAR_DIFERENCIAS'],
                roles: ['EMPLEADO', 'ADMIN', 'DUEÑO'],
                label: 'Modificado en Fábrica',
                color: 'orange',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    VER: 'AMBOS'
                }
            },
            PREPARADO: {
                siguientesEstados: ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'],
                permisos: ['CONFIRMAR_RECEPCION'],
                roles: ['EMPLEADO', 'ADMIN', 'DUEÑO'],
                label: 'Preparado',
<<<<<<< Updated upstream
                color: 'yellow',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    VER: 'AMBOS'
=======
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
>>>>>>> Stashed changes
                }
            },
            RECIBIDO_CON_DIFERENCIAS: {
                siguientesEstados: ['RECIBIDO', 'PREPARADO_MODIFICADO'],
                permisos: ['ACEPTAR_DIFERENCIAS', 'RECHAZAR_DIFERENCIAS'],
                roles: ['FABRICA', 'ADMIN', 'DUEÑO'],
                label: 'Con Diferencias',
                color: 'red',
                permisosEspeciales: {
                    MODIFICAR: 'DESTINO',
                    VER: 'AMBOS'
                }
            },
            PREPARADO_MODIFICADO: {
                siguientesEstados: ['RECIBIDO'],
                permisos: ['CONFIRMAR_RECEPCION'],
                roles: ['EMPLEADO', 'ADMIN', 'DUEÑO'],
                label: 'Preparado con Cambios',
                color: 'purple',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    VER: 'AMBOS'
                }
            },
<<<<<<< Updated upstream
            RECIBIDO: {
                siguientesEstados: ['FINALIZADO'],
                permisos: ['FINALIZAR_PEDIDO'],
                roles: ['EMPLEADO', 'ADMIN', 'DUEÑO'],
                label: 'Recibido',
                color: 'green',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    VER: 'AMBOS'
                }
            },
=======
>>>>>>> Stashed changes
            FINALIZADO: {
                siguientesEstados: [],
                permisos: [],
                roles: ['ADMIN', 'DUEÑO'],
                label: 'Finalizado',
                color: 'emerald',
                permisosEspeciales: {
                    VER: 'AMBOS'
                }
            },
            CANCELADO: {
                siguientesEstados: [],
                permisos: [],
                roles: ['ADMIN', 'DUEÑO'],
                label: 'Cancelado',
                color: 'red',
                permisosEspeciales: {
                    VER: 'AMBOS'
                }
            }
        }
    }),

    actions: {
        puedeTransicionarA(estadoActual, estadoDestino, rol) {
            const estado = this.estadosPedido[estadoActual];
            if (!estado) return false;
            return estado.siguientesEstados.includes(estadoDestino) &&
                this.estadosPedido[estadoDestino].roles.includes(rol);
        },

        obtenerAccionesPermitidas(estadoActual, rol) {
            const estado = this.estadosPedido[estadoActual];
            if (!estado) return [];
            return estado.siguientesEstados.filter(e =>
                this.estadosPedido[e].roles.includes(rol)
            );
        },

<<<<<<< Updated upstream
        puedeVerPedido(pedido, usuario) {
            const estado = this.estadosPedido[pedido.estado];
            if (!estado) return false;

            // Admin y Dueño siempre pueden ver
=======
        puedeVerPedido: (state) => (pedido, usuario) => {
            if (!pedido || !usuario) return false;
>>>>>>> Stashed changes
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            const tipoPermiso = estado.permisosEspeciales?.VER;
            switch (tipoPermiso) {
                case 'ORIGEN':
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
                case 'DESTINO':
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_destino);
                case 'AMBOS':
                    return usuario.sucursales.some(s =>
                        s.id === pedido.sucursal_origen || s.id === pedido.sucursal_destino
                    );
                default:
                    return false;
            }
        },

        puedeModificarPedido(pedido, usuario) {
            const estado = this.estadosPedido[pedido.estado];
            if (!estado) return false;

<<<<<<< Updated upstream
            // Verificar rol
            if (!estado.roles.includes(usuario.rol)) return false;

            // Admin y Dueño tienen permisos especiales
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol)) return true;

            // Verificar permisos de sucursal
            const tipoPermiso = estado.permisosEspeciales?.MODIFICAR;
            switch (tipoPermiso) {
                case 'ORIGEN':
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
                case 'DESTINO':
                    return usuario.sucursales.some(s => s.id === pedido.sucursal_destino);
                case 'AMBOS':
                    return usuario.sucursales.some(s =>
                        s.id === pedido.sucursal_origen || s.id === pedido.sucursal_destino
                    );
                default:
                    return false;
            }
        },

        puedeCancelarPedido(pedido, usuario) {
            // Si es admin o dueño, siempre puede cancelar hasta EN_FABRICA
            if (['ADMIN', 'DUEÑO'].includes(usuario.rol) &&
                ['BORRADOR', 'EN_FABRICA'].includes(pedido.estado)) {
                return true;
=======
            // Nuevo: Verificar si el pedido está finalizado
            if (pedido.estado === 'FINALIZADO') {
                return usuario.rol === 'ADMIN';
>>>>>>> Stashed changes
            }

            const estado = this.estadosPedido[pedido.estado];
            if (!estado) return false;

            // Verificar si el estado permite cancelación
            if (!estado.siguientesEstados.includes('CANCELADO')) return false;

            // Verificar permiso especial de cancelación
            const tipoPermiso = estado.permisosEspeciales?.CANCELAR;
            if (tipoPermiso === 'ORIGEN') {
                return usuario.sucursales.some(s => s.id === pedido.sucursal_origen);
            }

            return false;
        },

        obtenerEtiquetaEstado(estado) {
            return this.estadosPedido[estado]?.label || estado;
        },

        obtenerColorEstado(estado) {
            return this.estadosPedido[estado]?.color || 'gray';
        },

        tienePermiso(estado, permiso, rol) {
            const estadoConfig = this.estadosPedido[estado];
            if (!estadoConfig) return false;
            return estadoConfig.permisos.includes(permiso) &&
                estadoConfig.roles.includes(rol);
        }
    },
    // Parte 2: actions del pedidoStateMachine.js

<<<<<<< Updated upstream
    getters: {
        todosLosEstados: (state) => Object.keys(state.estadosPedido),

        estadosActivos: (state) =>
=======
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
            if (this.rolEnPedido === 'ORIGEN' && estado === 'EN_FABRICA') {
                return [];
            }

            if (this.rolEnPedido === 'FABRICA' && ['EN_FABRICA', 'EN_FABRICA_MODIFICADO'].includes(estado)) {
                const hayModificacionesFabrica = await this.verificarModificacionesSucursalDestino(pedido.pedido_id);

                return [{
                    accion: 'PREPARAR',
                    estado: hayModificacionesFabrica ? 'PREPARADO_MODIFICADO' : 'PREPARADO',
                    habilitado: true,
                    label: hayModificacionesFabrica ? 'Preparar con Modificaciones' : 'Preparar'
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
>>>>>>> Stashed changes
