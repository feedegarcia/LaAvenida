<!-- components/pedidos/EstadoPedido.vue -->
<template>
    <span class="px-2 py-1 text-xs rounded-full font-medium"
          :class="{
          'bg-gray-100 text-gray-800': estado === 'BORRADOR',
          'bg-blue-100 text-blue-800': estado === 'EN_FABRICA',
          'bg-orange-100 text-orange-800': estado === 'EN_FABRICA_MODIFICADO',
          'bg-yellow-100 text-yellow-800': estado === 'RECIBIDO_CON_DIFERENCIAS',
          'bg-green-100 text-green-800': estado === 'RECIBIDO',
          'bg-emerald-100 text-emerald-800': estado === 'FINALIZADO',
          'bg-red-100 text-red-800': estado === 'CANCELADO'
        }">
        {{ estadoLabel }}
    </span>
</template>

<script setup>
    import { computed } from 'vue'

    const props = defineProps({
        estado: {
            type: String,
            required: true
        }
    })

    const estadoLabel = computed(() => {
        const labels = {
            'BORRADOR': 'Borrador',
            'EN_FABRICA': 'En Fábrica',
            'EN_FABRICA_MODIFICADO': 'Modificado en Fábrica',
            'RECIBIDO_CON_DIFERENCIAS': 'Con Diferencias',
            'RECIBIDO': 'Recibido',
            'FINALIZADO': 'Finalizado',
            'CANCELADO': 'Cancelado'
        }
        return labels[props.estado] || props.estado
    })
</script>