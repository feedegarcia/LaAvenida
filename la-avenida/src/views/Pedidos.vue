<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Pedidos</h2>
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
                @close="pedidoSeleccionado = null"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b">
                        <h3 class="text-lg font-medium">
                            Detalle de Pedido #{{ pedidoSeleccionado?.pedido_id }}
                        </h3>
                        <button @click="pedidoSeleccionado = null"
                                class="text-gray-500 hover:text-gray-700">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="p-4 max-h-[80vh] overflow-y-auto">
                        <TimelinePedido v-if="pedidoSeleccionado"
                                        :pedido="pedidoSeleccionado"
                                        @estadoActualizado="actualizarPedido" />
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { Dialog, DialogPanel } from '@headlessui/vue'
    import { X } from 'lucide-vue-next'
    import PedidosKanban from '../components/pedidos/PedidosKanban.vue'
    import TimelinePedido from '../components/pedidos/TimelinePedido.vue'
    import axios from '@/utils/axios-config'

    const vistaActual = ref('kanban')
    const pedidoSeleccionado = ref(null)

    const mostrarDetallePedido = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            pedidoSeleccionado.value = response.data
        } catch (error) {
            console.error('Error cargando detalle del pedido:', error)
        }
    }

    const actualizarPedido = async () => {
        if (pedidoSeleccionado.value) {
            await mostrarDetallePedido(pedidoSeleccionado.value.pedido_id)
        }
    }
</script>