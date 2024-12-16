<template>
    <div class="space-y-8">
        <div v-if="!loading" class="space-y-6">
            <div v-for="seccion in seccionesOrdenadas"
                 :key="seccion.id"
                 class="bg-gray-50 rounded-lg p-6">
                <div class="flex items-center gap-2 mb-6">
                    <h2 class="text-xl font-bold text-avenida-black">{{ seccion.titulo }}</h2>
                </div>

                <div class="grid md:grid-cols-3 gap-6">
                    <div v-for="columna in seccion.columnas"
                         :key="columna.id"
                         class="bg-white rounded-lg shadow-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-lg">{{ columna.titulo }}</h3>
                            <div class="flex items-center space-x-2">
                                <button @click="cambiarPagina(seccion.id, columna.id, -1)"
                                        :disabled="getPagina(seccion.id, columna.id) <= 1"
                                        class="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
                                    &lt;
                                </button>
                                <span class="text-sm text-gray-500">
                                    {{ getPaginaActual(seccion.id, columna.id, getPedidosFiltrados(columna.estados, seccion.tipo)) }}
                                </span>
                                <button @click="cambiarPagina(seccion.id, columna.id, 1)"
                                        :disabled="!hayMasPaginas(seccion.id, columna.id, getPedidosFiltrados(columna.estados, seccion.tipo))"
                                        class="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
                                    &gt;
                                </button>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <PedidoCard v-for="pedido in getPedidosPaginados(seccion.id, columna.id, getPedidosFiltrados(columna.estados, seccion.tipo))"
                                        :key="pedido.pedido_id"
                                        :pedido="pedido"
                                        :highlight="Boolean(pedido.tiene_solicitud_pendiente)"
                                        @click="$emit('pedido-seleccionado', pedido.pedido_id)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import PedidoCard from './PedidoCard.vue';
    import axios from '@/utils/axios-config';

    const ITEMS_POR_PAGINA = 2;
    const pedidoStore = usePedidoStore();
    const pedidos = ref([]);
    const loading = ref(false);
    const paginacion = ref({});

    const props = defineProps({
        sucursalActiva: {
            type: Number,
            required: true,
            default: 0 
        }
    });

    const emit = defineEmits(['pedido-seleccionado']);

    const seccionesOrdenadas = computed(() => [
        {
            id: 'pedidos-cola',
            titulo: 'Pedidos por Procesar',
            columnas: [
                {
                    id: 'en_fabrica',
                    titulo: 'En Fabrica',
                    estados: ['EN_FABRICA', 'EN_FABRICA_MODIFICADO']
                },
                {
                    id: 'finalizados',
                    titulo: 'Finalizados',
                    estados: ['FINALIZADO']
                }
            ]
        },
        {
            id: 'pedidos-realizados',
            titulo: 'Pedidos Realizados',
            tipo: 'origen',
            columnas: [
                {
                    id: 'borradores',
                    titulo: 'Borradores',
                    estados: ['BORRADOR']
                },
                {
                    id: 'en_proceso',
                    titulo: 'En Proceso',
                    estados: ['EN_FABRICA', 'EN_FABRICA_MODIFICADO', 'PREPARADO', 'PREPARADO_MODIFICADO']
                },
                {
                    id: 'finalizados',
                    titulo: 'Finalizados',
                    estados: ['RECIBIDO', 'FINALIZADO']
                }
            ]
        }
    ]);

    const getPagina = (seccionId, columnaId) => {
        const key = `${seccionId}_${columnaId}`;
        return paginacion.value[key] || 1;
    };

    const setPagina = (seccionId, columnaId, pagina) => {
        paginacion.value[`${seccionId}_${columnaId}`] = pagina;
    };

    const cambiarPagina = (seccionId, columnaId, delta) => {
        const key = `${seccionId}_${columnaId}`;
        paginacion.value[key] = (paginacion.value[key] || 1) + delta;
    };

    const getPaginaActual = (seccionId, columnaId, pedidosFiltrados) => {
        const pagina = getPagina(seccionId, columnaId);
        const totalPaginas = Math.ceil(pedidosFiltrados.length / ITEMS_POR_PAGINA) || 1;
        return `${pagina}/${totalPaginas}`;
    };

    const hayMasPaginas = (seccionId, columnaId, pedidosFiltrados) => {
        const pagina = getPagina(seccionId, columnaId);
        return pagina * ITEMS_POR_PAGINA < pedidosFiltrados.length;
    };

    const getPedidosPaginados = (seccionId, columnaId, pedidosFiltrados) => {
        const pagina = getPagina(seccionId, columnaId);
        const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
        return pedidosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
    };

    const getPedidosFiltrados = (estados, tipo) => {
        if (!props.sucursalActiva) return [];

        return pedidos.value.filter(pedido => {
            const pedidoSucursalId = tipo === 'origen' ?
                pedido.sucursal_origen : pedido.sucursal_destino;

            return pedidoSucursalId === props.sucursalActiva &&
                estados.includes(pedido.estado);
        });
    };

    const cargarPedidos = async () => {
        try {
            loading.value = true;
            const response = await axios.get('/api/pedidos');
            pedidos.value = response.data;
        } catch (error) {
            if (error.name !== 'CanceledError') {
                console.error('Error cargando pedidos:', error);
            }
        } finally {
            loading.value = false;
        }
    };

    watch(() => props.sucursalActiva, () => {
        cargarPedidos();
    });

    onMounted(() => {
        cargarPedidos();
    });

    defineExpose({
        recargarPedidos: cargarPedidos
    });
</script>