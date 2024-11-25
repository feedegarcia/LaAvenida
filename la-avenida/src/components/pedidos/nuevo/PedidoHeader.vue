<template>
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-bold text-avenida-black">Nuevo Pedido</h3>
        <div class="flex space-x-2">
            <button @click="$emit('guardar-borrador')"
                    :disabled="!puedeGuardar"
                    class="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50 disabled:opacity-50">
                Guardar Borrador
            </button>
            <button @click="$emit('confirmar')"
                    :disabled="!puedeGuardar"
                    class="px-4 py-2 bg-avenida-green text-white rounded-md hover:bg-green-600 disabled:opacity-50">
                Confirmar Pedido
            </button>
        </div>

        <!-- Totales solo para Admin y Dueño -->
        <div v-if="puedeVerTotales && puedeGuardar" class="ml-4 flex items-center">
            <span class="font-medium text-gray-700">
                Total: $ {{ totalFormateado }}
            </span>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';

    const nuevoPedidoStore = useNuevoPedidoStore();

    const props = defineProps({
        puedeGuardar: {
            type: Boolean,
            required: true
        },
        puedeVerTotales: {
            type: Boolean,
            default: false
        }
    });

    defineEmits(['guardar-borrador', 'confirmar']);

    const totalFormateado = computed(() => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(nuevoPedidoStore.totalPedido || 0);
    });
</script>