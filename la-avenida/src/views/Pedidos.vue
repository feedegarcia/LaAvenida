<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-avenida-black">Gestion de Pedidos</h2>
            <div class="flex items-center space-x-4">
                <router-link v-if="puedeCrearPedidos"
                             to="/pedidos/nuevo"
                             class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-avenida-green-light">
                    Nuevo Pedido
                </router-link>
            </div>
        </div>

        <!-- Vista de Kanban -->
        <PedidosKanban ref="kanbanRef"
                       @pedidoSeleccionado="mostrarDetallePedido" />

        <!-- Modal de Detalle de Pedido -->
        <TransitionRoot :show="!!pedidoSeleccionado" as="template">
            <Dialog as="div"
                    class="relative z-50"
                    :open="!!pedidoSeleccionado"
                    @close="cerrarDetallePedido">
                <!-- Overlay -->
                <TransitionChild as="template"
                                 enter="ease-out duration-300"
                                 enter-from="opacity-0"
                                 enter-to="opacity-100"
                                 leave="ease-in duration-200"
                                 leave-from="opacity-100"
                                 leave-to="opacity-0">
                    <div class="fixed inset-0 bg-black/30" />
                </TransitionChild>

                <!-- Modal -->
                <div class="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild as="template"
                                     enter="ease-out duration-300"
                                     enter-from="opacity-0 scale-95"
                                     enter-to="opacity-100 scale-100"
                                     leave="ease-in duration-200"
                                     leave-from="opacity-100 scale-100"
                                     leave-to="opacity-0 scale-95">
                        <DialogPanel class="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
                            <!-- Header del modal -->
                            <div class="flex justify-between items-center p-4 border-b">
                                <DialogTitle as="h3" class="text-lg font-medium">
                                    Detalle de Pedido #{{ pedidoSeleccionado?.pedido_id }}
                                </DialogTitle>
                                <button @click="cerrarDetallePedido"
                                        class="text-gray-500 hover:text-gray-700">
                                    <X class="w-5 h-5" />
                                </button>
                            </div>

                            <!-- Contenido del modal -->
                            <div class="p-4 max-h-[80vh] overflow-y-auto">
                                <TimelinePedido v-if="pedidoSeleccionado"
                                                :pedido="pedidoSeleccionado"
                                                @estadoActualizado="manejarCambioEstado" />
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import {
        Dialog,
        DialogPanel,
        DialogTitle,
        TransitionRoot,
        TransitionChild
    } from '@headlessui/vue';
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

    const puedeCrearPedidos = computed(() => {
        return ['ADMIN', 'DUEÑO', 'EMPLEADO'].includes(authStore.user.rol);
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

    const cerrarDetallePedido = () => {
        pedidoSeleccionado.value = null;
    };

    const manejarCambioEstado = async (cambios) => {
        await kanbanRef.value?.recargarPedidos();
        if (pedidoSeleccionado.value) {
            await mostrarDetallePedido(pedidoSeleccionado.value.pedido_id);
        }
    };
</script>