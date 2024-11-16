<!-- components/pedidos/PedidoCard.vue -->
<template>
    <div class="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
         @click="verDetalle">
        <div class="flex justify-between items-start mb-2">
            <div>
                <span class="text-sm font-medium">#{{ pedido.pedido_id }}</span>
                <h4 class="font-medium">{{ pedido.destino }}</h4>
                <!-- Badge de modificación pendiente -->
                <span v-if="highlight"
                      class="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full mt-1">
                    Modificación pendiente
                </span>
            </div>
            <EstadoPedido :estado="pedido.estado" />
        </div>

        <div class="text-sm text-gray-600 space-y-1">
            <div class="flex justify-between">
                <span>Fecha Pedido:</span>
                <span>{{ formatoFecha(pedido.fecha_pedido) }}</span>
            </div>
            <div class="flex justify-between">
                <span>Entrega:</span>
                <span>{{ formatoFecha(pedido.fecha_entrega_requerida) }}</span>
            </div>
        </div>

        <div v-if="esRolAdministrativo"
             class="mt-3 pt-3 border-t border-gray-100">
            <div class="flex justify-between text-sm">
                <span class="font-medium">Total:</span>
                <span class="font-medium">$ {{ formatoMoneda(pedido.total_pedido) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { jwtDecode } from 'jwt-decode';
    import EstadoPedido from './EstadoPedido.vue';

    const router = useRouter();

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        },
        highlight: {
            type: Boolean,
            default: false
        }
    });

    // Obtener rol del usuario del token
    const userRole = computed(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded = jwtDecode(token);
        return decoded.rol;
    });

    const esRolAdministrativo = computed(() =>
        userRole.value === 'ADMIN' || userRole.value === 'DUEÑO'
    );

    const formatoFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const verDetalle = () => {
        router.push(`/pedidos/${props.pedido.pedido_id}`);
    };
</script>