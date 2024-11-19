// src/stores/pedidoStateMachine.js

import { defineStore } from 'pinia';

export const usePedidoStore = defineStore('pedido', {
    state: () => ({
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
                color: 'yellow',
                permisosEspeciales: {
                    MODIFICAR: 'ORIGEN',
                    VER: 'AMBOS'
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

        puedeVerPedido(pedido, usuario) {
            const estado = this.estadosPedido[pedido.estado];
            if (!estado) return false;

            // Admin y Dueño siempre pueden ver
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

    getters: {
        todosLosEstados: (state) => Object.keys(state.estadosPedido),

        estadosActivos: (state) =>