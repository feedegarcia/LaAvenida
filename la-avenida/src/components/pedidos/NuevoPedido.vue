<template>
    <div class="bg-white shadow-lg rounded-lg p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center space-x-4">
                <h3 class="text-lg font-bold text-avenida-black">Nuevo Pedido</h3>
            </div>
            <div class="flex space-x-2">
                <button @click="guardarBorrador"
                        class="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50">
                    Guardar Borrador
                </button>
                <button @click="confirmarPedido"
                        class="px-4 py-2 bg-avenida-green text-white rounded-md hover:bg-green-600">
                    Confirmar Pedido
                </button>
            </div>
        </div>

        <!-- Grid de fecha y clima -->
        <div class="grid grid-cols-3 gap-6 mb-6">
            <!-- Calendario reducido -->
            <div class="col-span-2">
                <CalendarioReducido v-model="fechaSeleccionada"
                                    @update:modelValue="onFechaSeleccionada" />
            </div>

            <!-- Widget del Clima -->
            <div class="col-span-1">
                <WeatherWidget v-if="fechaSeleccionada"
                               :fecha-pedido="normalizarFecha(fechaSeleccionada)" />
            </div>
        </div>

        <!-- Selector de Sucursal -->
        <div v-if="sucursalesUsuario.length > 1" class="bg-gray-50 p-4 rounded-lg mb-6">
            <div class="max-w-md">
                <label class="block text-sm font-medium text-gray-700 mb-1">Sucursal que realiza el pedido</label>
                <select v-model="sucursalSeleccionada"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                        @change="guardarSucursalPreferida">
                    <option value="">Seleccione una sucursal</option>
                    <option v-for="sucursal in sucursalesUsuario"
                            :key="sucursal.sucursal_id"
                            :value="sucursal.sucursal_id">
                        {{ sucursal.nombre }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Loading o contenido -->
        <div v-if="!productosPorSucursal" class="text-center py-4">
            Cargando productos...
        </div>

        <template v-else>
            <!-- Grid de fábricas -->
            <div class="grid md:grid-cols-2 gap-6">
                <div v-for="(fabrica, sucursalId) in productosPorSucursal.fabricas"
                     :key="sucursalId"
                     class="border rounded-lg p-4">
                    <h4 class="text-xl font-bold text-avenida-black mb-4">{{ fabrica.nombre }}</h4>

                    <!-- Subcategorías -->
                    <div class="space-y-4">
                        <div v-for="subcategoria in getSubcategoriasOrdenadas(sucursalId, fabrica.subcategorias)"
                             :key="subcategoria.subcategoria_id"
                             class="border rounded-lg">
                            <div class="bg-gray-50 p-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2 flex-1">
                                        <div class="flex space-x-1">
                                            <button @click.stop="() => moverGrupo(sucursalId, subcategoria.subcategoria_id || subcategoriaKey, 'arriba')"
                                                    type="button"
                                                    class="p-1 hover:bg-gray-200 rounded text-gray-600">
                                                ↑
                                            </button>
                                            <button @click.stop="() => moverGrupo(sucursalId, subcategoria.subcategoria_id || subcategoriaKey, 'abajo')"
                                                    type="button"
                                                    class="p-1 hover:bg-gray-200 rounded text-gray-600">
                                                ↓
                                            </button>
                                        </div>
                                        <div class="flex-1 cursor-pointer"
                                             @click="toggleSubcategoria(sucursalId, subcategoria.subcategoria_id)">
                                            <h5 class="font-medium">
                                                {{ subcategoria.nombre }}
                                                <span class="text-sm text-gray-500">
                                                    ({{ subcategoria.productos.length }})
                                                </span>
                                            </h5>
                                        </div>
                                        <span class="transform transition-transform"
                                              :class="{ 'rotate-180': !isSubcategoriaColapsada(sucursalId, subcategoria.subcategoria_id) }">
                                            ▼
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div v-show="!isSubcategoriaColapsada(sucursalId, subcategoria.subcategoria_id)"
                                 class="p-3">
                                <div v-for="producto in subcategoria.productos"
                                     :key="producto.producto_id"
                                     class="grid grid-cols-4 gap-2 items-center text-sm py-1">
                                    <span>{{ formatearNombre(producto.nombre) }}</span>
                                    <span class="text-gray-600">Stock: {{ producto.stock || 0 }}</span>
                                    <span class="text-gray-600">Último: {{ producto.ultimo_pedido || '-' }}</span>
                                    <input type="number"
                                           v-model="cantidades[producto.producto_id]"
                                           min="0"
                                           class="w-16 px-2 py-1 border rounded text-center">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Secciones Varios y Sin TAC -->
            <div class="grid md:grid-cols-2 gap-6 mt-6">
                <!-- Varios -->
                <div v-if="productosPorSucursal.varios.length" class="border rounded-lg p-4">
                    <h4 class="text-xl font-bold mb-4 text-avenida-black">Varios</h4>
                    <div class="space-y-4">
                        <div v-for="producto in productosPorSucursal.varios"
                             :key="producto.producto_id"
                             class="grid grid-cols-4 gap-2 items-center text-sm py-1">
                            <span>{{ producto.nombre }}</span>
                            <span class="text-gray-600">Stock: {{ producto.stock || 0 }}</span>
                            <span class="text-gray-600">Último: {{ producto.ultimo_pedido || '-' }}</span>
                            <input type="number"
                                   v-model="cantidades[producto.producto_id]"
                                   min="0"
                                   class="w-16 px-2 py-1 border rounded text-center">
                        </div>
                    </div>
                </div>

                <!-- Sin TAC -->
                <div v-if="productosPorSucursal.sinTac.length" class="border rounded-lg p-4">
                    <h4 class="text-xl font-bold mb-4 text-avenida-black">Sin TAC</h4>
                    <div class="space-y-4">
                        <div v-for="producto in productosPorSucursal.sinTac"
                             :key="producto.producto_id"
                             class="grid grid-cols-4 gap-2 items-center text-sm py-1">
                            <span>{{ producto.nombre }}</span>
                            <span class="text-gray-600">Stock: {{ producto.stock || 0 }}</span>
                            <span class="text-gray-600">Último: {{ producto.ultimo_pedido || '-' }}</span>
                            <input type="number"
                                   v-model="cantidades[producto.producto_id]"
                                   min="0"
                                   class="w-16 px-2 py-1 border rounded text-center">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notas -->
            <div class="mt-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Notas del pedido:</label>
                <textarea v-model="pedido.notas"
                          placeholder="Agregar notas o comentarios al pedido..."
                          rows="3"
                          class="w-full border rounded-md px-3 py-2 shadow-sm focus:ring-avenida-green focus:border-avenida-green resize-none"></textarea>
            </div>
        </template>
    </div>
</template>
<style scoped>
    .subcategoria-collapse-enter-active,
    .subcategoria-collapse-leave-active {
        transition: all 0.3s ease;
    }

    .subcategoria-collapse-enter-from,
    .subcategoria-collapse-leave-to {
        opacity: 0;
        transform: translateY(-10px);
    }
</style>
<script setup>
    import { ref, computed, onMounted } from 'vue';
    import CalendarioReducido from '@/components/calendario/CalendarioReducido.vue';
    import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
    import { useEventosStore } from '@/stores/eventos'
    import WeatherWidget from './WeatherWidget.vue';
    import axios from 'axios'
    import { useRouter } from 'vue-router'
    import { jwtDecode } from 'jwt-decode'

    // Configuración básica de axios
    axios.defaults.baseURL = 'http://localhost:3000'
    const eventosStore = useEventosStore()
    const currentDate = ref(new Date())
    const fechaSeleccionada = ref(obtenerProximaFechaEntrega());

    // Función para obtener la próxima fecha de entrega (miércoles o sábado)
    function obtenerProximaFechaEntrega() {
        const hoy = new Date();
        let fecha = new Date(hoy);

        // Si es después de las 11 AM, empezar desde mañana
        if (hoy.getHours() >= 11) {
            fecha.setDate(fecha.getDate() + 1);
        }

        // Buscar próximo miércoles o sábado
        while (true) {
            const dia = fecha.getDay();
            if (dia === 3 || dia === 6) {
                break;
            }
            fecha.setDate(fecha.getDate() + 1);
        }

        fecha.setHours(0, 0, 0, 0); // Resetear la hora a medianoche
        return fecha;
    }

    // Computed para los días del mes actual
    const obtenerDiasMes = computed(() => {
        const year = currentDate.value.getFullYear()
        const month = currentDate.value.getMonth()
        const primerDia = new Date(year, month, 1)
        const ultimoDia = new Date(year, month + 1, 0)
        const dias = []

        // Agregar días del mes anterior para completar la primera semana
        for (let i = 0; i < primerDia.getDay(); i++) {
            const fecha = new Date(year, month, -i)
            dias.unshift(fecha)
        }

        // Agregar días del mes actual
        for (let i = 1; i <= ultimoDia.getDate(); i++) {
            dias.push(new Date(year, month, i))
        }

        // Agregar días del mes siguiente para completar la última semana
        const diasRestantes = 7 - (dias.length % 7)
        if (diasRestantes < 7) {
            for (let i = 1; i <= diasRestantes; i++) {
                dias.push(new Date(year, month + 1, i))
            }
        }

        return dias
    })

    // Fecha mínima permitida (hoy)
    const fechaMinima = computed(() => {
        const fecha = new Date()
        return fecha.toISOString().split('T')[0]
    })

    const cambiarMes = (delta) => {
        const nuevaFecha = new Date(currentDate.value)
        nuevaFecha.setMonth(nuevaFecha.getMonth() + delta)
        currentDate.value = nuevaFecha
    }

    const esFechaSeleccionada = (fecha) => {
        if (!fechaSeleccionada.value) return false;
        const fecha1 = new Date(fecha);
        const fecha2 = new Date(fechaSeleccionada.value);
        fecha1.setHours(0, 0, 0, 0);
        fecha2.setHours(0, 0, 0, 0);
        return fecha1.getTime() === fecha2.getTime();
    };

    const esProximaEntrega = (fecha) => {
        const dia = fecha.getDay()
        return (dia === 3 || dia === 6) && esFechaValida(fecha)
    }

    const esFechaValida = (fecha) => {
        const hoy = new Date()
        return fecha >= hoy
    }

    const seleccionarFecha = (date) => {
        fechaSeleccionada.value = date;
        pedido.value.fecha_entrega_requerida = date.toISOString().split('T')[0];
    };

    // Inicialización
    onMounted(async () => {
        await eventosStore.inicializar()

        // Si no hay fecha seleccionada, seleccionar la próxima fecha de entrega
        if (!fechaSeleccionada.value) {
            fechaSeleccionada.value = obtenerProximaFechaEntrega()
            pedido.value.fecha_entrega_requerida = fechaSeleccionada.value.toISOString().split('T')[0]
        }
    })

    const router = useRouter()
    const borradorActivo = ref(null)
    const sucursalSeleccionada = ref(null)
    const sucursalesUsuario = ref([])
    const colapsados = ref(new Set())
    const ordenSubcategorias = ref(new Map())
    const pedido = ref({
        fecha_entrega_requerida: fechaSeleccionada.value.toISOString().split('T')[0], // Formato YYYY-MM-DD
        notas: ''
    });
    const productos = ref(null)
    const cantidades = ref({})
    const errores = ref({})

    // Computed
    const productosPorSucursal = computed(() => productos.value)

    // Sistema de colapso
    const toggleSubcategoria = (sucursalId, subcategoriaId) => {
        const key = `${sucursalId}_${subcategoriaId}`
        if (colapsados.value.has(key)) {
            colapsados.value.delete(key)
        } else {
            colapsados.value.add(key)
        }
    }

    const isSubcategoriaColapsada = (sucursalId, subcategoriaId) =>
        colapsados.value.has(`${sucursalId}_${subcategoriaId}`)

    // Sistema de ordenamiento
    const getSubcategoriasOrdenadas = (sucursalId, subcategorias) => {
        if (!subcategorias || typeof subcategorias !== 'object') {
            return []
        }

        const items = Object.entries(subcategorias).map(([id, data]) => ({
            ...data,
            subcategoria_id: parseInt(id)
        }))

        const orden = ordenSubcategorias.value.get(parseInt(sucursalId))

        if (!orden) {
            return items
        }

        return [...items].sort((a, b) => {
            const indexA = orden.indexOf(a.subcategoria_id)
            const indexB = orden.indexOf(b.subcategoria_id)
            return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB)
        })
    }

    const moverGrupo = async (sucursalId, subcategoriaId, direccion) => {
        try {
            const sucId = parseInt(sucursalId)
            const subId = parseInt(subcategoriaId)
            const token = localStorage.getItem('token')
            const decodedToken = jwtDecode(token)
            const usuarioId = decodedToken.id

            const fabrica = productosPorSucursal.value?.fabricas[sucId]
            if (!fabrica?.subcategorias) return

            let orden = ordenSubcategorias.value.get(sucId) ||
                Object.keys(fabrica.subcategorias).map(k => parseInt(k))

            const currentIndex = orden.indexOf(subId)
            if (currentIndex === -1) return

            let newIndex = currentIndex
            if (direccion === 'arriba' && currentIndex > 0) {
                newIndex = currentIndex - 1
            } else if (direccion === 'abajo' && currentIndex < orden.length - 1) {
                newIndex = currentIndex + 1
            }

            if (newIndex === currentIndex) return

            const newOrden = [...orden]
                ;[newOrden[currentIndex], newOrden[newIndex]] = [newOrden[newIndex], newOrden[currentIndex]]

            ordenSubcategorias.value = new Map(ordenSubcategorias.value)
            ordenSubcategorias.value.set(sucId, newOrden)

            for (let i = 0; i < newOrden.length; i++) {
                await axios.post(`/api/preferencias/orden-secciones/${usuarioId}`, {
                    sucursal_id: sucId,
                    grupo_id: newOrden[i].toString(),
                    orden: i,
                    tipo: 'GRUPO'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            }

        } catch (error) {
            console.error('Error al guardar el orden:', error)
        }
    }

    const normalizarFecha = (fecha) => {
        if (!fecha) return null;
        const date = new Date(fecha);
        date.setHours(0, 0, 0, 0); // Resetea la hora a medianoche
        return date;
    };

    // Funciones de carga
    const cargarPreferencias = async () => {
        try {
            const token = localStorage.getItem('token')
            const decodedToken = jwtDecode(token)
            const usuarioId = decodedToken.id

            const response = await axios.get(`/api/preferencias/orden-secciones/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.data && Object.keys(response.data).length > 0) {
                ordenSubcategorias.value = new Map()

                Object.entries(response.data).forEach(([sucursalId, orden]) => {
                    const ordenFiltrado = orden.filter(id => id != null).map(Number)
                    if (ordenFiltrado.length > 0) {
                        ordenSubcategorias.value.set(parseInt(sucursalId), ordenFiltrado)
                    }
                })
            }
        } catch (error) {
            console.error('Error cargando preferencias:', error)
        }
    }

    const cargarSucursalesUsuario = async () => {
        try {
            const token = localStorage.getItem('token')
            const decodedToken = jwtDecode(token)
            const usuarioId = decodedToken.id

            const response = await axios.get(`/api/users/${usuarioId}/sucursales`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            sucursalesUsuario.value = response.data

            const ultimaSucursal = localStorage.getItem('ultimaSucursalSeleccionada')
            if (ultimaSucursal && sucursalesUsuario.value.some(s => s.sucursal_id === parseInt(ultimaSucursal))) {
                sucursalSeleccionada.value = parseInt(ultimaSucursal)
            } else if (sucursalesUsuario.value.length > 0) {
                sucursalSeleccionada.value = sucursalesUsuario.value[0].sucursal_id
            }
        } catch (error) {
            console.error('Error cargando sucursales:', error)
        }
    }

    const cargarDatos = async () => {
        try {
            const response = await axios.get('/api/productos/pedido', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            productos.value = response.data
        } catch (error) {
            console.error('Error cargando productos:', error)
        }
    }

    // Funciones de utilidad
    const guardarSucursalPreferida = () => {
        localStorage.setItem('ultimaSucursalSeleccionada', sucursalSeleccionada.value)
    }


    const formatearNombre = (nombre) => {
        const palabras = nombre.split(' ')
        return palabras.length > 1 ? palabras.slice(1).join(' ') : nombre
    }

    // Lógica de pedidos
    const encontrarProducto = (productoId) => {
        const buscarEnLista = (lista) => lista?.find(p => p.producto_id === productoId)

        for (const fabrica of Object.values(productosPorSucursal.value.fabricas)) {
            for (const subcategoria of Object.values(fabrica.subcategorias)) {
                const producto = buscarEnLista(subcategoria.productos)
                if (producto) return producto
            }
        }

        return buscarEnLista(productosPorSucursal.value.varios) ||
            buscarEnLista(productosPorSucursal.value.sinTac)
    }

    const validarPedido = () => {
        errores.value = {}
        if (!pedido.value.fecha_entrega_requerida) {
            errores.value.fecha_entrega_requerida = 'Seleccione una fecha de entrega'
        }
        if (!sucursalSeleccionada.value) {
            errores.value.sucursal = 'Seleccione una sucursal para realizar el pedido'
        }
        return Object.keys(errores.value).length === 0
    }
    // Agregar nuevo método para manejar la selección de fecha
    const onFechaSeleccionada = (fecha) => {
        fechaSeleccionada.value = fecha;
        // Formatear la fecha como YYYY-MM-DD
        const fechaFormateada = fecha.toISOString().split('T')[0];
        pedido.value.fecha_entrega_requerida = fechaFormateada;
    };
    const guardarBorrador = async () => {
        try {
            const detalles = Object.entries(cantidades.value)
                .filter(([, cantidad]) => cantidad > 0)
                .map(([productoId, cantidad]) => {
                    const producto = encontrarProducto(parseInt(productoId))
                    if (!producto) {
                        throw new Error(`Producto no encontrado: ${productoId}`)
                    }
                    return {
                        producto_id: parseInt(productoId),
                        cantidad: parseInt(cantidad),
                        precio_unitario: producto.precio_mayorista || 0
                    }
                })

            if (detalles.length === 0) {
                alert('Debe seleccionar al menos un producto')
                return
            }

            if (!sucursalSeleccionada.value) {
                alert('Debe seleccionar una sucursal')
                return
            }

            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No hay token de autenticación')
            }

            const decodedToken = jwtDecode(token)
            const dataToSend = {
                sucursal_id: parseInt(sucursalSeleccionada.value),
                usuario_id: parseInt(decodedToken.id),
                fecha_entrega_requerida: pedido.value.fecha_entrega_requerida,
                detalles: detalles,
                notas: pedido.value.notas || ''
            }

            const response = await axios.post('/api/pedidos/borrador', dataToSend, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            alert('Borrador guardado exitosamente')
        } catch (error) {
            console.error('Error detallado:', error)
            let mensajeError = 'Error al guardar el borrador: ' + (error.response?.data?.error || error.message)
            alert(mensajeError)
        }
    }

    const confirmarPedido = async () => {
        if (!validarPedido()) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No hay token de autenticación');
            }

            const detalles = Object.entries(cantidades.value)
                .filter(([, cantidad]) => cantidad > 0)
                .map(([productoId, cantidad]) => {
                    const producto = encontrarProducto(parseInt(productoId));
                    if (!producto) {
                        throw new Error(`Producto no encontrado: ${productoId}`);
                    }
                    return {
                        producto_id: parseInt(productoId),
                        cantidad: parseInt(cantidad),
                        precio_unitario: producto.precio_mayorista || 0,
                        origen_id: producto.origen_id,
                        tipo_origen: producto.tipo_origen
                    };
                });

            if (detalles.length === 0) {
                alert('Debe seleccionar al menos un producto');
                return;
            }

            const pedidosPorOrigen = detalles.reduce((acc, detalle) => {
                const producto = encontrarProducto(detalle.producto_id);
                const sucursalDestino = producto.tipo_origen === 'ELABORACION_PROPIA'
                    ? producto.sucursal_fabricante_id
                    : producto.lugar_pedido_defecto;

                if (!sucursalDestino) {
                    throw new Error(`El producto ${producto.nombre} no tiene definido un destino de pedido`);
                }

                if (!acc[sucursalDestino]) {
                    acc[sucursalDestino] = {
                        sucursal_origen: sucursalSeleccionada.value,
                        sucursal_destino: sucursalDestino,
                        fecha_entrega_requerida: fechaSeleccionada.value.toISOString().split('T')[0], // Asegurar formato YYYY-MM-DD
                        tipo: 'PEDIDO_FABRICA',
                        detalles: [],
                        notas: pedido.value.notas || ''
                    };
                }

                acc[sucursalDestino].detalles.push({
                    producto_id: detalle.producto_id,
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario
                });

                return acc;
            }, {});

            for (const [, pedidoData] of Object.entries(pedidosPorOrigen)) {
                await axios.post('/api/pedidos', pedidoData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            if (borradorActivo.value) {
                await axios.patch(
                    `/api/pedidos/borrador/${borradorActivo.value}/confirmar`,
                    {},
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            }

            alert('Pedidos creados exitosamente');
            router.push('/pedidos');
        } catch (error) {
            console.error('Error detallado:', error);
            let mensajeError = 'Error al crear pedido: ' + (error.response?.data?.error || error.message);
            alert(mensajeError);
        }
    };

    // Inicialización
    onMounted(async () => {
        await cargarSucursalesUsuario()
        pedido.value.fecha_entrega_requerida = obtenerProximaFechaEntrega()
        await cargarPreferencias()
        await cargarDatos()
    })
</script>
