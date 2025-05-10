<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Pedidos</h2>
            <div class="flex items-center space-x-4">
                <!-- Selector de Sucursal -->
                <div v-if="sucursales.length > 1" class="relative">
                    <select v-model="sucursalSeleccionada"
                            class="block w-48 rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                        <option v-for="sucursal in sucursales"
                                :key="sucursal.id"
                                :value="sucursal.id">
                            {{ sucursal.nombre }}
                        </option>
                    </select>
                </div>
                <router-link v-if="puedeCrearPedidos"
                             to="/pedidos/nuevo"
                             class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-avenida-green-light">
                    Nuevo Pedido
                </router-link>
            </div>
        </div>

        <!-- Vista de Kanban -->
        <PedidosKanban ref="kanbanRef"
                       :sucursal-activa="sucursalSeleccionada"
                       @pedido-seleccionado="mostrarDetallePedido" />

        <!-- Modal de Detalle de Pedido -->
        <TransitionRoot :show="!!pedidoSeleccionado" as="template">
            <Dialog as="div"
                    class="relative z-50"
                    :open="!!pedidoSeleccionado"
                    @close="cerrarDetallePedido">
                <TransitionChild as="template"
                                 enter="ease-out duration-300"
                                 leave="ease-in duration-200"
                                 enter-from="opacity-0"
                                 enter-to="opacity-100"
                                 leave-from="opacity-100"
                                 leave-to="opacity-0">
                    <div class="fixed inset-0 bg-black/30" />
                </TransitionChild>

                <div class="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild as="template"
                                     enter="ease-out duration-300"
                                     leave="ease-in duration-200"
                                     enter-from="opacity-0 scale-95"
                                     enter-to="opacity-100 scale-100"
                                     leave-from="opacity-100 scale-100"
                                     leave-to="opacity-0 scale-95">
                        <DialogPanel class="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
                            <div class="flex justify-between items-center p-4 border-b">
                                <DialogTitle as="h3" class="text-lg font-medium">
                                    Detalle de Pedido #{{ pedidoSeleccionado?.pedido_id }}
                                </DialogTitle>
                                <button @click="cerrarDetallePedido"
                                        class="text-gray-500 hover:text-gray-700">
                                    <X class="w-5 h-5" />
                                </button>
                            </div>

                            <div class="p-4 max-h-[80vh] overflow-y-auto">
                                <TimelinePedido v-if="pedidoSeleccionado"
                                                :pedido="pedidoSeleccionado"
                                                :sucursal-activa="sucursalSeleccionada"
                                                @estado-actualizado="manejarCambioEstado" />
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
    import { X } from 'lucide-vue-next';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import PedidosKanban from '@/components/pedidos/PedidosKanban.vue';
    import TimelinePedido from '@/components/pedidos/TimelinePedido.vue';
    import axios from '@/utils/axios-config';

    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();

    const pedidoSeleccionado = ref(null);
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
            if (kanbanRef.value) {
                kanbanRef.value.recargarPedidos();
            }
        }
    });

    const mostrarDetallePedido = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}`);
            pedidoSeleccionado.value = response.data;
            pedidoStore.setContexto(sucursalSeleccionada.value, response.data);
        } catch (error) {
            console.error('Error al cargar pedido:', error);
        }
    };

    const cerrarDetallePedido = () => {
        pedidoSeleccionado.value = null;
    };

    const manejarCambioEstado = async () => {
        await kanbanRef.value?.recargarPedidos();
        if (pedidoSeleccionado.value) {
            await mostrarDetallePedido(pedidoSeleccionado.value.pedido_id);
        }
    };
</script>