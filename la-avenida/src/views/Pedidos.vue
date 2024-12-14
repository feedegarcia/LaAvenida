<template>
<<<<<<< Updated upstream
    <div>
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Pedidos</h2>
=======
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-avenida-black">Gestion de Pedidos</h2>
>>>>>>> Stashed changes
            <div class="flex items-center space-x-4">
                <router-link to="/pedidos/nuevo"
                             class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-avenida-green-light">
                    Nuevo Pedido
                </router-link>
            </div>
        </div>

        <!-- Vista de Kanban -->
        <div v-if="vistaActual === 'kanban'">
            <PedidosKanban @pedidoSeleccionado="mostrarDetallePedido" />
        </div>

        <!-- Modal de Detalle de Pedido -->
        <Dialog :open="!!pedidoSeleccionado"
                @close="cerrarDetallePedido"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b">
                        <h3 class="text-lg font-medium">
                            Detalle de Pedido #{{ pedidoSeleccionado?.pedido_id }}
                        </h3>
                        <button @click="cerrarDetallePedido"
                                class="text-gray-500 hover:text-gray-700">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="p-4 max-h-[80vh] overflow-y-auto">
                        <TimelinePedido v-if="pedidoSeleccionado"
                                        :pedido="pedidoSeleccionado"
                                        @estadoActualizado="manejarCambioEstado" />
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { Dialog, DialogPanel } from '@headlessui/vue';
    import { X } from 'lucide-vue-next';
    import { useRouter } from 'vue-router';
    import PedidosKanban from '../components/pedidos/PedidosKanban.vue';
    import TimelinePedido from '../components/pedidos/TimelinePedido.vue';
    import axios from '@/utils/axios-config';

    const router = useRouter();
    const vistaActual = ref('kanban');
    const pedidoSeleccionado = ref(null);
<<<<<<< Updated upstream
=======
    const kanbanRef = ref(null);
    const sucursales = computed(() => authStore.user.sucursales || []);
    const sucursalSeleccionada = ref(0);

    const puedeCrearPedidos = computed(() => {
        return ['ADMIN', 'DUEÑO', 'EMPLEADO'].includes(authStore.user.rol);
    });

    onMounted(() => {
        const ultimaSucursal = localStorage.getItem('ultimaSucursalSeleccionada');
        const sucursalInicial = ultimaSucursal && sucursales.value.find(s => s.id === parseInt(ultimaSucursal))
            ? parseInt(ultimaSucursal)
            : sucursales.value[0]?.id || 0;

        sucursalSeleccionada.value = sucursalInicial;
    });

    watch(sucursalSeleccionada, (newValue) => {
        if (newValue) {
            localStorage.setItem('ultimaSucursalSeleccionada', newValue.toString());
            pedidoStore.setContexto(newValue);
        }
    });

    const mostrarDetallePedido = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}`);
            pedidoSeleccionado.value = response.data;
        } catch (error) {
            if (error.name !== 'CanceledError') {
                console.error('Error al cargar pedido:', error);
            }
        }
    };
>>>>>>> Stashed changes

    const cerrarDetallePedido = () => {
        pedidoSeleccionado.value = null;
    };

    const manejarCambioEstado = async ({ estado, pedidoId, isFinalState }) => {
        try {
            // Si es un estado final o un cambio de cola, cerrar y redireccionar
            const estadosQueCambianCola = [
                'EN_FABRICA',
                'EN_FABRICA_MODIFICADO',
                'PREPARADO',
                'RECIBIDO',
                'RECIBIDO_CON_DIFERENCIAS',
                'FINALIZADO',
                'CANCELADO'
            ];

            const debeRedireccionar = isFinalState || estadosQueCambianCola.includes(estado);

            if (debeRedireccionar) {
                // Cerrar el modal
                cerrarDetallePedido();

                // Forzar la recarga de los datos
                if (router.currentRoute.value.path === '/pedidos') {
                    const kanbanComponent = document.querySelector('pedidos-kanban')?.__vueParentComponent?.ctx;
                    if (kanbanComponent && typeof kanbanComponent.cargarDatos === 'function') {
                        await kanbanComponent.cargarDatos();
                    }
                } else {
                    await router.push('/pedidos');
                }
            } else {
                // Solo actualizar el pedido actual si no es un estado final
                await mostrarDetallePedido(pedidoId);
            }
        } catch (error) {
            console.error('Error manejando cambio de estado:', error);
        }
    };

    const mostrarDetallePedido = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            pedidoSeleccionado.value = response.data;
        } catch (error) {
            console.error('Error cargando detalle del pedido:', error);
        }
    };
</script>