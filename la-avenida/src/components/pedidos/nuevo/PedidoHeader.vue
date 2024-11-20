// src/components/pedidos/nuevo/PedidoHeader.vue
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
    </div>
</template>

<script setup>
defineProps({
  puedeGuardar: {
    type: Boolean,
    required: true
  }
});

defineEmits(['guardar-borrador', 'confirmar']);
</script>