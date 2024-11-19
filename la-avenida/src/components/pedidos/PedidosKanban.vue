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

        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
            <p>Cargando pedidos...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-red-600">
            {{ error }}
        </div>

        <!-- Content -->
        <div v-else>
            <div v-for="seccion in secciones" :key="seccion.id" class="mb-6">
                <!-- Pedidos en Cola -->
                <div v-if="seccion.id === 'pedidos-cola'" class="bg-gray-50 rounded-lg p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <h2 class="text-xl font-bold text-avenida-black">{{ seccion.titulo }}</h2>
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
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
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
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
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
                        <h2 class="text-xl font-bold text-avenida-black">{{ seccion.titulo }}</h2>
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
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
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
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
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
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
                            </div>
                            <div v-else class="text-center text-gray-500 py-4">
                                No hay pedidos finalizados
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { jwtDecode } from 'jwt-decode'
    import axios from 'axios'
    import PedidoCard from './PedidoCard.vue'


    const emit = defineEmits(['pedidoSeleccionado'])
    // Estados base
    const pedidos = ref([])
    const sucursalSeleccionada = ref('')
    const ordenInvertido = ref(false)
    const loading = ref(false)
    const error = ref('')
    const sucursalesUsuario = ref([])

    // Sistema de paginación
    const paginacion = ref({
        en_curso: { realizados: 1, recibidos: 1 },
        borrador: { realizados: 1 },
        finalizado: { realizados: 1, recibidos: 1 }
    })

    const itemsPorPagina = 4

    // Definición de secciones
    const secciones = computed(() => {
        const orden = [
            { id: 'pedidos-cola', titulo: 'Pedidos en Cola' },
            { id: 'pedidos-hacemos', titulo: 'Pedidos que hacemos' }
        ]
        return ordenInvertido.value ? orden.reverse() : orden
    })

    // Computed properties para sucursales
    const sucursalesDisponibles = computed(() => {
        if (!Array.isArray(pedidos.value)) return []

        // Obtener todas las sucursales únicas de los pedidos
        const allSucursales = pedidos.value.reduce((acc, pedido) => {
            acc.add(pedido.origen)
            acc.add(pedido.destino)
            return acc
        }, new Set())

        // Filtrar por las sucursales asignadas al usuario
        return [...allSucursales].filter(sucursal =>
            sucursalesUsuario.value.some(s => s.nombre === sucursal)
        )
    })

    // Computed properties para pedidos
    const pedidosRecibidos = computed(() =>
        Array.isArray(pedidos.value)
            ? pedidos.value.filter(p => p.destino === sucursalSeleccionada.value)
            : []
    );


    const pedidosEnCurso = computed(() => {
        const estadosEnCurso = ['EN_FABRICA', 'PREPARADO', 'EN_FABRICA_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS', 'PREPARADO_MODIFICADO'];
        const filtrados = pedidosRealizados.value.filter(p =>
            estadosEnCurso.includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

        const inicio = (paginacion.value.en_curso.realizados - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    });

    const pedidosBorrador = computed(() => {
        const filtrados = pedidosRealizados.value.filter(p =>
            p.estado === 'BORRADOR'
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

        const inicio = (paginacion.value.borrador.realizados - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    });

    const pedidosFinalizados = computed(() => {
        const estadosFinalizados = ['RECIBIDO', 'FINALIZADO', 'CANCELADO'];
        const filtrados = pedidosRealizados.value.filter(p =>
            estadosFinalizados.includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

        const inicio = (paginacion.value.finalizado.realizados - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    }); 

    const pedidosEnColaActivos = computed(() => {
        const estadosActivos = ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'];
        const filtrados = pedidosRecibidos.value.filter(p =>
            estadosActivos.includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

        const inicio = (paginacion.value.en_curso.recibidos - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    });

    const pedidosEnColaFinalizados = computed(() => {
        const estadosFinalizados = ['RECIBIDO', 'FINALIZADO', 'CANCELADO'];
        const filtrados = pedidosRecibidos.value.filter(p =>
            estadosFinalizados.includes(p.estado)
        ).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

        const inicio = (paginacion.value.finalizado.recibidos - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    });

    const pedidosRealizados = computed(() =>
        Array.isArray(pedidos.value)
            ? pedidos.value.filter(p => p.origen === sucursalSeleccionada.value)
            : []
    );

    // Funciones de paginación
    const getTotalItems = (tipo, grupo) => {
        const pedidosGrupo = grupo === 'realizados' ? pedidosRealizados.value : pedidosRecibidos.value

        const cantidades = {
            en_curso: pedidosGrupo.filter(p =>
                ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(p.estado)
            ).length,
            borrador: pedidosGrupo.filter(p => p.estado === 'BORRADOR').length,
            finalizado: pedidosGrupo.filter(p =>
                ['RECIBIDO', 'CANCELADO'].includes(p.estado)
            ).length
        }

        return cantidades[tipo] || 0
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

    // Funciones principales
    const cargarSucursalesUsuario = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            const decoded = jwtDecode(token)
            const response = await axios.get(
                `http://localhost:3000/api/users/${decoded.id}/sucursales`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            )

            sucursalesUsuario.value = response.data

            // Seleccionar la primera sucursal disponible
            if (response.data.length > 0) {
                sucursalSeleccionada.value = response.data[0].nombre
            }
        } catch (error) {
            console.error('Error cargando sucursales del usuario:', error)
        }
    }

    const cargarDatos = async () => {
        try {
            loading.value = true
            error.value = ''

            const response = await axios.get('http://localhost:3000/api/pedidos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            // Asegurarnos que pedidos.value sea siempre un array
            pedidos.value = Array.isArray(response.data) ? response.data : []

        } catch (err) {
            console.error('Error cargando pedidos:', err)
            error.value = 'Error al cargar los pedidos'
            pedidos.value = []
        } finally {
            loading.value = false
        }
    }

    const toggleOrden = () => {
        ordenInvertido.value = !ordenInvertido.value
    }

    // Inicialización
    onMounted(async () => {
        await cargarSucursalesUsuario()
        await cargarDatos()
    })
</script>