
<template>
    <div class="space-y-8">
        <!-- Tabs de sucursales -->
        <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8">
                <button v-for="sucursal in sucursalesDisponibles"
                        :key="sucursal"
                        @click="sucursalSeleccionada = sucursal"
                        :class="[
                        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                        sucursalSeleccionada === sucursal
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]">
                    {{ sucursal }}
                </button>
            </nav>
        </div>

        <!-- Secciones principales -->
        <template v-for="seccion in secciones" :key="seccion.id">
            <!-- Pedidos en Cola -->
            <div v-if="seccion.id === 'pedidos-cola'" class="bg-gray-50 rounded-lg p-6">
                <div class="flex items-center gap-2 mb-6">
                    <h2 class="text-xl font-bold text-avenida-black">Pedidos en Cola</h2>
                    <button @click="toggleOrden"
                            class="px-2 py-0.5 text-sm bg-white rounded shadow hover:bg-gray-50">
                        {{ ordenInvertido ? '↑' : '↓' }}
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <!-- Pedidos en Curso -->
                    <div class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">Pedidos en curso</h3>
                            <div class="flex space-x-1">
                                <button @click="cambiarPagina('en_curso', 'anterior', 'recibidos')"
                                        :disabled="!puedeRetrocederPagina('en_curso', 'recibidos')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &lt;
                                </button>
                                <button @click="cambiarPagina('en_curso', 'siguiente', 'recibidos')"
                                        :disabled="!puedeAvanzarPagina('en_curso', 'recibidos')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>
                        <div v-if="pedidosEnColaActivos.length > 0" class="space-y-4">
                            <PedidoCard v-for="pedido in pedidosEnColaActivos"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                       :highlight="!!pedido.tiene_solicitud_pendiente"
                                        @click="verDetallePedido(pedido)" />
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            No hay pedidos en curso
                        </div>
                    </div>

                    <!-- Finalizados -->
                    <div class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">Finalizados</h3>
                            <div class="flex space-x-1">
                                <button @click="cambiarPagina('finalizado', 'anterior', 'recibidos')"
                                        :disabled="!puedeRetrocederPagina('finalizado', 'recibidos')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &lt;
                                </button>
                                <button @click="cambiarPagina('finalizado', 'siguiente', 'recibidos')"
                                        :disabled="!puedeAvanzarPagina('finalizado', 'recibidos')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>
                        <div v-if="pedidosEnColaFinalizados.length > 0" class="space-y-4">
                            <PedidoCard v-for="pedido in pedidosEnColaFinalizados"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                        :highlight="!!pedido.tiene_solicitud_pendiente"
                                        @click="verDetallePedido(pedido)" />
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            No hay pedidos finalizados
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pedidos que hacemos -->
            <div v-if="seccion.id === 'pedidos-hacemos'" class="bg-gray-50 rounded-lg p-6">
                <div class="flex items-center gap-2 mb-6">
                    <h2 class="text-xl font-bold text-avenida-black">Pedidos que hacemos</h2>
                    <button @click="toggleOrden"
                            class="px-2 py-0.5 text-sm bg-white rounded shadow hover:bg-gray-50">
                        {{ ordenInvertido ? '↑' : '↓' }}
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-6">
                    <!-- Pedidos en Curso -->
                    <div class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">Pedidos en curso</h3>
                            <div class="flex space-x-1">
                                <button @click="cambiarPagina('en_curso', 'anterior', 'realizados')"
                                        :disabled="!puedeRetrocederPagina('en_curso', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &lt;
                                </button>
                                <button @click="cambiarPagina('en_curso', 'siguiente', 'realizados')"
                                        :disabled="!puedeAvanzarPagina('en_curso', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>
                        <div v-if="pedidosEnCurso.length > 0" class="space-y-4">
                            <PedidoCard v-for="pedido in pedidosEnCurso"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                        :highlight="!!pedido.tiene_solicitud_pendiente"
                                        @click="verDetallePedido(pedido)" />
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            No hay pedidos en curso
                        </div>
                    </div>

                    <!-- Borradores -->
                    <div class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">Borradores</h3>
                            <div class="flex space-x-1">
                                <button @click="cambiarPagina('borrador', 'anterior', 'realizados')"
                                        :disabled="!puedeRetrocederPagina('borrador', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &lt;
                                </button>
                                <button @click="cambiarPagina('borrador', 'siguiente', 'realizados')"
                                        :disabled="!puedeAvanzarPagina('borrador', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>
                        <div v-if="pedidosBorrador.length > 0" class="space-y-4">
                            <PedidoCard v-for="pedido in pedidosBorrador"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                        :highlight="!!pedido.tiene_solicitud_pendiente"
                                        @click="verDetallePedido(pedido)" />
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            No hay borradores
                        </div>
                    </div>

                    <!-- Finalizados -->
                    <div class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">Finalizados</h3>
                            <div class="flex space-x-1">
                                <button @click="cambiarPagina('finalizado', 'anterior', 'realizados')"
                                        :disabled="!puedeRetrocederPagina('finalizado', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &lt;
                                </button>
                                <button @click="cambiarPagina('finalizado', 'siguiente', 'realizados')"
                                        :disabled="!puedeAvanzarPagina('finalizado', 'realizados')"
                                        class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>
                        <div v-if="pedidosFinalizados.length > 0" class="space-y-4">
                            <PedidoCard v-for="pedido in pedidosFinalizados"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                        :highlight="!!pedido.tiene_solicitud_pendiente"
                                        @click="verDetallePedido(pedido)" />
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            No hay pedidos finalizados
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { jwtDecode } from 'jwt-decode'
    import axios from 'axios'
    import PedidoCard from './PedidoCard.vue' 

    axios.defaults.baseURL = 'http://localhost:3000'

    // Estados base
    const pedidos = ref([])
    const sucursalSeleccionada = ref('')
    const ordenInvertido = ref(false)

    // Sistema de paginación
    const paginacion = ref({
        en_curso: { realizados: 1, recibidos: 1 },
        borrador: { realizados: 1 },
        finalizado: { realizados: 1, recibidos: 1 }
    })

    const itemsPorPagina = 4

    // Computed para el orden de las secciones principales
    const secciones = computed(() => {
        const orden = [
            { id: 'pedidos-cola', titulo: 'Pedidos en Cola' },
            { id: 'pedidos-hacemos', titulo: 'Pedidos que hacemos' }
        ]
        return ordenInvertido.value ? [...orden].reverse() : orden
    })

    const pedidosConSolicitud = computed(() => {
        return pedidos.value.map(pedido => ({
            ...pedido,
            tiene_solicitud_pendiente: pedido.solicitudes_modificacion?.some(
                s => s.estado === 'PENDIENTE'
            )
        }))

    })
    // Computed properties base
    const sucursalesDisponibles = computed(() => {
        if (!pedidos.value) return []
        const sucursales = new Set()
        pedidos.value.forEach(p => {
            sucursales.add(p.origen)
            sucursales.add(p.destino)
        })
        return Array.from(sucursales)
    })

    const pedidosRecibidos = computed(() =>
        pedidos.value?.filter(p => p.destino === sucursalSeleccionada.value) || []
    )

    const pedidosRealizados = computed(() =>
        pedidos.value?.filter(p => p.origen === sucursalSeleccionada.value) || []
    )

    // Computed properties para cada sección
    const pedidosEnCurso = computed(() => {
        let filtrados = pedidosRealizados.value.filter(p =>
            ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido))

        const inicio = (paginacion.value.en_curso.realizados - 1) * itemsPorPagina
        return filtrados.slice(inicio, inicio + itemsPorPagina)
    })

    const pedidosBorrador = computed(() => {
        let filtrados = pedidosRealizados.value.filter(p => p.estado === 'BORRADOR')
            .sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido))

        const inicio = (paginacion.value.borrador.realizados - 1) * itemsPorPagina
        return filtrados.slice(inicio, inicio + itemsPorPagina)
    })

    const pedidosFinalizados = computed(() => {
        let filtrados = pedidosRealizados.value.filter(p =>
            ['RECIBIDO', 'CANCELADO'].includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido))

        const inicio = (paginacion.value.finalizado.realizados - 1) * itemsPorPagina
        return filtrados.slice(inicio, inicio + itemsPorPagina)
    })

    const pedidosEnColaActivos = computed(() => {
        let filtrados = pedidosRecibidos.value.filter(p =>
            ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido))

        const inicio = (paginacion.value.en_curso.recibidos - 1) * itemsPorPagina
        return filtrados.slice(inicio, inicio + itemsPorPagina)
    })

    const pedidosEnColaFinalizados = computed(() => {
        let filtrados = pedidosRecibidos.value.filter(p =>
            ['RECIBIDO', 'CANCELADO'].includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido))

        const inicio = (paginacion.value.finalizado.recibidos - 1) * itemsPorPagina
        return filtrados.slice(inicio, inicio + itemsPorPagina)
    })

    // Funciones de paginación
    const getTotalItems = (tipo, grupo) => {
        const pedidos = {
            realizados: {
                en_curso: pedidosRealizados.value.filter(p =>
                    ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(p.estado)
                ).length,
                borrador: pedidosRealizados.value.filter(p => p.estado === 'BORRADOR').length,
                finalizado: pedidosRealizados.value.filter(p =>
                    ['RECIBIDO', 'CANCELADO'].includes(p.estado)
                ).length
            },
            recibidos: {
                en_curso: pedidosRecibidos.value.filter(p =>
                    ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(p.estado)
                ).length,
                finalizado: pedidosRecibidos.value.filter(p =>
                    ['RECIBIDO', 'CANCELADO'].includes(p.estado)
                ).length
            }
        }
        return pedidos[grupo]?.[tipo] || 0
    }

    const puedeAvanzarPagina = (tipo, grupo = 'realizados') => {
        const totalItems = getTotalItems(tipo, grupo)
        const paginaActual = paginacion.value[tipo][grupo]
        return totalItems > paginaActual * itemsPorPagina
    }

    const puedeRetrocederPagina = (tipo, grupo = 'realizados') => {
        return paginacion.value[tipo][grupo] > 1
    }

    const cambiarPagina = (tipo, direccion, grupo = 'realizados') => {
        if (direccion === 'siguiente' && puedeAvanzarPagina(tipo, grupo)) {
            paginacion.value[tipo][grupo]++
        } else if (direccion === 'anterior' && puedeRetrocederPagina(tipo, grupo)) {
            paginacion.value[tipo][grupo]--
        }
    }

    // Función de toggle orden
    const toggleOrden = async () => {
        ordenInvertido.value = !ordenInvertido.value
        await guardarPreferencias()
    }

    // Agregar las funciones de guardado y carga de preferencias
    const guardarPreferencias = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            const decodedToken = jwtDecode(token)
            if (!decodedToken?.id) return

            const response = await axios.post(
                `/api/preferencias/orden-secciones/${decodedToken.id}`,
                { orden: ordenInvertido.value ? 1 : 0 },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (!response.data.success) {
                throw new Error('No se pudo guardar la preferencia')
            }
        } catch (error) {
            console.error('Error al guardar preferencias:', error)
        }
    }

    const cargarPreferencias = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            const decodedToken = jwtDecode(token)
            if (!decodedToken?.id) return

            const response = await axios.get(
                `/api/preferencias/orden-secciones/${decodedToken.id}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            )

            ordenInvertido.value = response.data.orden === 1
        } catch (error) {
            console.error('Error al cargar preferencias:', error)
        }
    }

    // Funciones de API
    const cargarDatos = async () => {
        try {
            const response = await axios.get('/api/pedidos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            })
            pedidos.value = response.data

            if (!sucursalSeleccionada.value && sucursalesDisponibles.value.length > 0) {
                sucursalSeleccionada.value = sucursalesDisponibles.value[0]
            }
        } catch (error) {
            console.error('Error cargando pedidos:', error)
            pedidos.value = []
        }
    }

    const verDetallePedido = (pedido) => {
        console.log('Ver detalle:', pedido)
    }

    onMounted(async () => {
        try {
            await cargarPreferencias()
            await cargarDatos()
        } catch (error) {
            console.error('Error en la inicialización:', error)
        }
    })
</script>
