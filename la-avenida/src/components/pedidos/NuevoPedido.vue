<template>
    <div class="bg-white shadow-lg rounded-lg p-6">
        <!-- Loading state -->
        <div v-if="nuevoPedidoStore.cargando" class="text-center py-8">
            <p>Cargando productos...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="nuevoPedidoStore.error"
             class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
            {{ nuevoPedidoStore.error }}
        </div>



        <template v-else>
            <!-- Header con botones de accion -->
            <PedidoHeader :puede-guardar="nuevoPedidoStore.tieneProductosSeleccionados || false"
                          :puede-ver-totales="puedeVerTotales"
                          @guardar-borrador="guardarBorrador"
                          @confirmar="confirmarPedido" />

            <!-- Selector de fecha y clima -->
            <SeleccionFecha />

            <!-- Selector de sucursal (si corresponde) -->
              <SelectorSucursal 
            ref="selectorSucursal"
            @sucursal-seleccionada="iniciarCargaProductos" />

            <!-- Seleccion de productos -->
            <SeleccionProductos />

            <!-- Resumen del pedido (totales, cantidades) -->
            <div v-if="nuevoPedidoStore.tieneProductosSeleccionados && puedeVerTotales"
                 class="bg-gray-50 p-4 rounded-lg mb-6">
                <div class="flex flex-col space-y-2">
                    <span class="text-sm text-gray-600">
                        Total productos seleccionados: {{ totalProductosSeleccionados }}
                    </span>
                    <span class="font-medium text-lg">
                        Total: $ {{ formatearMoneda(nuevoPedidoStore.totalPedido || 0) }}
                    </span>
                </div>
            </div>

            <!-- Notas -->
            <NotasPedido v-model="nuevoPedidoStore.pedido.notas" />
        </template>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
    import { useRouter } from 'vue-router';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';
    import { useAuthStore } from '@/stores/auth';

    // Componentes
    import PedidoHeader from '@/components/pedidos/nuevo/PedidoHeader.vue';
    import SeleccionFecha from '@/components/pedidos/nuevo/SeleccionFecha.vue';
    import SelectorSucursal from '@/components/pedidos/nuevo/SelectorSucursal.vue';
    import SeleccionProductos from '@/components/pedidos/nuevo/SeleccionProductos.vue';
    import NotasPedido from '@/components/pedidos/nuevo/NotasPedido.vue';

    const router = useRouter();
    const nuevoPedidoStore = useNuevoPedidoStore();
    const authStore = useAuthStore();

    const iniciarCargaProductos = async (sucursal) => {
        if (!sucursal?.id || nuevoPedidoStore.pedido.sucursal_origen === sucursal.id) {
            return;
        }

        try {
            nuevoPedidoStore.pedido.sucursal_origen = sucursal.id;
            await nuevoPedidoStore.cargarProductos();
        } catch (error) {
            if (error.name !== 'CanceledError') {
                console.error('Error al cargar productos:', error);
            }
        }
    };
    // Computed properties
    const puedeVerTotales = computed(() => {
        return ['ADMIN', 'DUEÑO'].includes(authStore.user.rol);
    });

    const totalProductosSeleccionados = computed(() => {
        return Object.values(nuevoPedidoStore.pedido.detalles)
            .reduce((total, detalle) => total + detalle.cantidad, 0);
    });

    // Methods
    const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const guardarBorrador = async () => {
        try {
            const resultado = await nuevoPedidoStore.guardarBorrador();
            router.push('/pedidos');
        } catch (error) {
            console.error('Error al guardar borrador:', error);
        }
    };

    const confirmarPedido = async () => {
        try {
            if (!validarPedido()) return;

            const resultado = await nuevoPedidoStore.confirmarPedido();
            router.push('/pedidos');
        } catch (error) {
            console.error('Error al confirmar pedido:', error);
        }
    };

    const validarPedido = () => {
        if (!nuevoPedidoStore.pedido.fecha_entrega_requerida) {
            alert('Seleccione una fecha de entrega');
            return false;
        }

        if (!nuevoPedidoStore.pedido.sucursal_origen) {
            alert('Seleccione una sucursal');
            return false;
        }

        if (!nuevoPedidoStore.tieneProductosSeleccionados) {
            alert('Debe seleccionar al menos un producto');
            return false;
        }

        return true;
    };

    onMounted(async () => {
        const borradorId = router.currentRoute.value.query.borrador;
        const sucursalUsuario = authStore.user.sucursales[0];

        // Inicializar pedido
        if (borradorId) {
            await nuevoPedidoStore.inicializarPedido('BORRADOR', borradorId);
        } else {
            await nuevoPedidoStore.inicializarPedido('NUEVO');
        }

        // Si hay una sola sucursal, manejar la carga inicial
        if (authStore.user.sucursales.length === 1) {
            // Establecer la sucursal origen
            nuevoPedidoStore.pedido.sucursal_origen = sucursalUsuario.id;

            // Esperar un momento para asegurar que todo esté inicializado
            await new Promise(resolve => setTimeout(resolve, 100));

            // Cargar productos
            try {
                await nuevoPedidoStore.cargarProductos();
            } catch (error) {
                if (error.name !== 'CanceledError') {
                    console.error('Error cargando productos:', error);
                }
            }
        }
    });

    onBeforeUnmount(() => {
        nuevoPedidoStore.resetear();
    });
</script>