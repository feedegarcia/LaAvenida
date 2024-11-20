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
            <div v-for="seccion in seccionesOrdenadas" :key="seccion.id" class="mb-6">
                <!-- Pedidos en Cola -->
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <h2 class="text-xl font-bold text-avenida-black">{{ seccion.titulo }}</h2>
                        <button @click="toggleOrden"
                                class="px-2 py-0.5 text-sm bg-white rounded shadow hover:bg-gray-50">
                            {{ ordenInvertido ? '↑' : '↓' }}
                        </button>
                    </div>

                    <div class="grid md:grid-cols-3 gap-6">
                        <!-- Columnas dinámicas basadas en estados -->
                        <div v-for="columna in seccion.columnas"
                             :key="columna.id"
                             class="bg-white rounded-lg shadow-lg p-4">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="font-semibold text-lg">{{ columna.titulo }}</h3>
                                <div class="flex space-x-1">
                                    <button @click="cambiarPagina(seccion.id, columna.id, 'anterior')"
                                            :disabled="!puedeRetrocederPagina(seccion.id, columna.id)"
                                            class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                        &lt;
                                    </button>
                                    <button @click="cambiarPagina(seccion.id, columna.id, 'siguiente')"
                                            :disabled="!puedeAvanzarPagina(seccion.id, columna.id)"
                                            class="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                                        &gt;
                                    </button>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <PedidoCard v-for="pedido in getPedidosPaginados(seccion.id, columna.id, columna.pedidos)"
                                            :key="pedido.pedido_id"
                                            :pedido="pedido"
                                            :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                            @click="$emit('pedidoSeleccionado', pedido.pedido_id)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import PedidoCard from './PedidoCard.vue';
    import axios from '@/utils/axios-config';

    const emit = defineEmits(['pedidoSeleccionado']);

    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();
    const pedidos = ref([]);
    const sucursalSeleccionada = ref('');
    const ordenInvertido = ref(false);
    const loading = ref(false);
    const error = ref('');
    const sucursalesUsuario = ref([]);

    // Configuración de paginación
    const itemsPorPagina = 4;
    const paginacion = ref({});

    // Inicializar paginación
    const initializePaginacion = () => {
        paginacion.value = {
            'pedidos-cola': {
                'en_curso': 1,
                'finalizados': 1
            },
            'pedidos-realizados': {
                'en_curso': 1,
                'borradores': 1,
                'finalizados': 1
            }
        };
    };

    // Computed properties
    const sucursalesDisponibles = computed(() => {
        return sucursalesUsuario.value.map(s => s.nombre);
    });

    const pedidosVisibles = computed(() => {
        return pedidos.value.filter(p =>
            pedidoStore.puedeVerPedido(p, authStore.user) &&
            (p.origen === sucursalSeleccionada.value || p.destino === sucursalSeleccionada.value)
        );
    });

    const seccionesOrdenadas = computed(() => {
        const secciones = [
            {
                id: 'pedidos-cola',
                titulo: 'Pedidos en Cola',
                columnas: [
                    {
                        id: 'en_curso',
                        titulo: 'En Curso',
                        pedidos: filtrarPedidosPorEstados(['EN_FABRICA', 'EN_FABRICA_MODIFICADO'], 'destino')
                    },
                    {
                        id: 'finalizados',
                        titulo: 'Finalizados',
                        pedidos: filtrarPedidosPorEstados(['RECIBIDO', 'FINALIZADO'], 'destino')
                    }
                ]
            },
            {
                id: 'pedidos-realizados',
                titulo: 'Pedidos Realizados',
                columnas: [
                    {
                        id: 'en_curso',
                        titulo: 'En Curso',
                        pedidos: filtrarPedidosPorEstados(['EN_FABRICA', 'EN_FABRICA_MODIFICADO'], 'origen')
                    },
                    {
                        id: 'borradores',
                        titulo: 'Borradores',
                        pedidos: filtrarPedidosPorEstados(['BORRADOR'], 'origen')
                    },
                    {
                        id: 'finalizados',
                        titulo: 'Finalizados',
                        pedidos: filtrarPedidosPorEstados(['RECIBIDO', 'FINALIZADO'], 'origen')
                    }
                ]
            }
        ];

        return ordenInvertido.value ? secciones.reverse() : secciones;
    });

    // Methods
    const filtrarPedidosPorEstados = (estados, tipoSucursal) => {
        return pedidosVisibles.value
            .filter(p => estados.includes(p.estado))
            .filter(p => {
                const sucursalId = tipoSucursal === 'origen' ? p.sucursal_origen : p.sucursal_destino;
                return sucursalId === sucursalesUsuario.value.find(s => s.nombre === sucursalSeleccionada.value)?.sucursal_id;
            })
            .sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));
    };

    const toggleOrden = () => {
        ordenInvertido.value = !ordenInvertido.value;
    };

    const getPedidosPaginados = (seccionId, columnaId, pedidosColumna) => {
        const pagina = paginacion.value[seccionId]?.[columnaId] || 1;
        const inicio = (pagina - 1) * itemsPorPagina;
        const fin = inicio + itemsPorPagina;
        return pedidosColumna.slice(inicio, fin);
    };

    const puedeAvanzarPagina = (seccionId, columnaId) => {
        const totalItems = getTotalItems(seccionId, columnaId);
        const pagina = paginacion.value[seccionId]?.[columnaId] || 1;
        return totalItems > pagina * itemsPorPagina;
    };

    const puedeRetrocederPagina = (seccionId, columnaId) => {
        return (paginacion.value[seccionId]?.[columnaId] || 1) > 1;
    };

    const cambiarPagina = (seccionId, columnaId, direccion) => {
        if (!paginacion.value[seccionId]) {
            paginacion.value[seccionId] = {};
        }

        if (!paginacion.value[seccionId][columnaId]) {
            paginacion.value[seccionId][columnaId] = 1;
        }

        if (direccion === 'siguiente' && puedeAvanzarPagina(seccionId, columnaId)) {
            paginacion.value[seccionId][columnaId]++;
        } else if (direccion === 'anterior' && puedeRetrocederPagina(seccionId, columnaId)) {
            paginacion.value[seccionId][columnaId]--;
        }
    };

    const getTotalItems = (seccionId, columnaId) => {
        const seccion = seccionesOrdenadas.value.find(s => s.id === seccionId);
        if (!seccion) return 0;

        const columna = seccion.columnas.find(c => c.id === columnaId);
        return columna?.pedidos.length || 0;
    };

    const cargarDatos = async () => {
        try {
            loading.value = true;
            error.value = '';

            const token = localStorage.getItem('token');
            const [sucursalesResponse, pedidosResponse] = await Promise.all([
                axios.get(`/api/users/${authStore.user.id}/sucursales`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('/api/pedidos', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            sucursalesUsuario.value = sucursalesResponse.data;
            if (sucursalesUsuario.value.length > 0 && !sucursalSeleccionada.value) {
                sucursalSeleccionada.value = sucursalesUsuario.value[0].nombre;
            }

            pedidos.value = pedidosResponse.data;
        } catch (err) {
            console.error('Error cargando datos:', err);
            error.value = 'Error al cargar los datos';
        } finally {
            loading.value = false;
        }
    };

    // Inicialización
    onMounted(() => {
        initializePaginacion();
        cargarDatos();
    });

    // Exponer método de recarga
    defineExpose({
        recargarPedidos: cargarDatos
    });
</script>