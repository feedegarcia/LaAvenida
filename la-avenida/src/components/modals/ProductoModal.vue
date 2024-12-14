<template>
    <TransitionRoot appear :show="show" as="template">
        <Dialog as="div" @close="handleClose" class="relative z-50">
            <TransitionChild as="template"
                             enter="duration-300 ease-out"
                             enter-from="opacity-0"
                             enter-to="opacity-100"
                             leave="duration-200 ease-in"
                             leave-from="opacity-100"
                             leave-to="opacity-0">
                <div class="fixed inset-0 bg-black/25" />
            </TransitionChild>

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <TransitionChild as="template"
                                     enter="duration-300 ease-out"
                                     enter-from="opacity-0 scale-95"
                                     enter-to="opacity-100 scale-100"
                                     leave="duration-200 ease-in"
                                     leave-from="opacity-100 scale-100"
                                     leave-to="opacity-0 scale-95">
                        <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                                {{ editingProducto ? 'Editar Producto' : 'Nuevo Producto' }}
                            </DialogTitle>

                            <form @submit.prevent="guardarProducto" class="space-y-4">
                                <!-- Datos basicos -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Codigo</label>
                                        <input type="text"
                                               v-model="formData.codigo"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input type="text"
                                               v-model="formData.nombre"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               required>
                                    </div>
                                </div>

                                <!-- Categoria y Subcategoria -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Categoria</label>
                                        <select v-model="formData.categoria_id"
                                                @change="cargarSubcategorias"
                                                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                                required>
                                            <option value="">Seleccione categoria</option>
                                            <option v-for="cat in categorias"
                                                    :key="cat.categoria_id"
                                                    :value="cat.categoria_id">
                                                {{ cat.nombre }}
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Subcategoria</label>
                                        <select v-model="formData.subcategoria_id"
                                                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                                required
                                                :disabled="!formData.categoria_id">
                                            <option value="">Seleccione subcategoria</option>
                                            <option v-for="sub in subcategorias"
                                                    :key="sub.subcategoria_id"
                                                    :value="sub.subcategoria_id">
                                                {{ sub.nombre }}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Precios -->
                                <div class="grid grid-cols-4 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Precio Venta</label>
                                        <input type="number"
                                               v-model="formData.precio_venta"
                                               step="0.01"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Precio Jueves</label>
                                        <input type="number"
                                               v-model="formData.precio_jueves"
                                               step="0.01"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Precio Mayorista</label>
                                        <input type="number"
                                               v-model="formData.precio_mayorista"
                                               step="0.01"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'"
                                               required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Costo Actual</label>
                                        <input type="number"
                                               v-model="formData.costo_actual"
                                               step="0.01"
                                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'"
                                               required>
                                    </div>
                                </div>
                                <!-- Caracteristicas adicionales -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Tipo de Origen</label>
                                        <select v-model="formData.tipo_origen"
                                                class="mt-1 block w-full rounded-md border-gray-300">
                                            <option value="ELABORACION_PROPIA">Elaboracion Propia</option>
                                            <option value="TERCEROS">Terceros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Sucursal Fabricante</label>
                                        <select v-model="formData.sucursal_fabricante_id"
                                                class="mt-1 block w-full rounded-md border-gray-300">
                                            <option v-for="sucursal in sucursales"
                                                    :key="sucursal.sucursal_id"
                                                    :value="sucursal.sucursal_id">
                                                {{ sucursal.nombre }}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Unidad de Medida</label>
                                        <select v-model="formData.unidad_medida_id"
                                                class="mt-1 block w-full rounded-md border-gray-300">
                                            <option v-for="unidad in unidadesMedida"
                                                    :key="unidad.unidad_id"
                                                    :value="unidad.unidad_id">
                                                {{ unidad.nombre }}
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                <!-- Checkboxes -->
                                <div class="flex space-x-6">
                                    <label class="flex items-center">
                                        <input type="checkbox"
                                               v-model="formData.es_sin_tac"
                                               class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'">
                                        <span class="ml-2 text-sm text-gray-600">Sin T.A.C.</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox"
                                               v-model="formData.requiere_refrigeracion"
                                               class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'">
                                        <span class="ml-2 text-sm text-gray-600">Requiere Refrigeracion</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox"
                                               v-model="formData.activo"
                                               class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'">
                                        <span class="ml-2 text-sm text-gray-600">Activo</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox"
                                               v-model="formData.visible_web"
                                               class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green"
                                               :disabled="userRole === 'EMPLEADO'">
                                        <span class="ml-2 text-sm text-gray-600">Visible en Web</span>
                                    </label>
                                </div>

                                <!-- Botones de accion -->
                                <div class="mt-6 flex justify-end space-x-3">
                                    <button type="button"
                                            @click="$emit('close')"
                                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-avenida-green">
                                        Cancelar
                                    </button>
                                    <button type="submit"
                                            class="px-4 py-2 text-sm font-medium text-white bg-avenida-green border border-transparent rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-avenida-green">
                                        {{ editingProducto ? 'Actualizar' : 'Crear' }}
                                    </button>
                                </div>
                            </form>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
    import { useProductosStore } from '@/stores/productos'
    import { jwtDecode } from 'jwt-decode'
    import axiosInstance from '@/utils/axios-config'

    const props = defineProps({
        show: Boolean,
        editingProducto: Object
    })

    const sucursales = ref([])
    const unidadesMedida = ref([])
    const formData = ref({
        codigo: '',
        nombre: '',
        categoria_id: '',
        subcategoria_id: '',
        precio_venta: '',
        precio_mayorista: '',
        precio_jueves: '',
        costo_actual: '',
        es_sin_tac: false,
        requiere_refrigeracion: true,
        activo: true,
        visible_web: true,
        // Nuevos campos
        tipo_origen: 'ELABORACION_PROPIA',
        sucursal_fabricante_id: '',
        unidad_medida_id: ''
    })

    const cargarDatos = async () => {
        try {
            const [sucursalesRes, unidadesRes] = await Promise.all([
                axiosInstance.get('/api/sucursales/activas'),
                axiosInstance.get('/api/productos/unidades-medida')
            ])
            sucursales.value = sucursalesRes.data
            unidadesMedida.value = unidadesRes.data
        } catch (error) {
            console.error('Error al cargar datos:', error)
        }
    }
    const emit = defineEmits(['close', 'saved'])
    const productosStore = useProductosStore()
    const userRole = ref('')

    // Computed properties
    const categorias = computed(() => productosStore.categorias)
    const subcategorias = computed(() => productosStore.subcategorias)

    // Metodos
    const cargarSubcategorias = async () => {
        if (formData.value.categoria_id) {
            await productosStore.cargarSubcategorias(formData.value.categoria_id)
            formData.value.subcategoria_id = ''
        }
    }

    const handleClose = () => {
        emit('close')
    }

    const guardarProducto = async () => {
        try {
            await productosStore.guardarProducto(formData.value)
            emit('saved')
        } catch (error) {
            console.error('Error al guardar el producto:', error)
        }
    }

    // Inicializacion
    onMounted(async () => {
        const token = localStorage.getItem('token')
        if (token) {
            const decoded = jwtDecode(token)
            userRole.value = decoded.rol
        }

        await Promise.all([
            productosStore.cargarCategorias(),
            cargarDatos()
        ])

        if (props.editingProducto) {
           
            formData.value = {
                ...formData.value, // mantener valores default
                ...props.editingProducto,
                tipo_origen: props.editingProducto.tipo_origen,
                sucursal_fabricante_id: props.editingProducto.sucursal_fabricante_id,
                visible_web: Boolean(Number(props.editingProducto.visible_web)),
                activo: Boolean(Number(props.editingProducto.activo)),
                es_sin_tac: Boolean(Number(props.editingProducto.es_sin_tac)),
                requiere_refrigeracion: Boolean(Number(props.editingProducto.requiere_refrigeracion))
            }

            if (props.editingProducto.categoria_id) {
                await cargarSubcategorias()
                formData.value.subcategoria_id = props.editingProducto.subcategoria_id
            }
        }
    })
</script>