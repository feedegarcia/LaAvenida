<template>
    <TransitionRoot appear :show="show" as="template">
        <Dialog as="div" @close="handleClose" class="relative z-50">
            <div class="fixed inset-0 bg-black/25" />
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-4xl bg-white rounded-lg shadow-xl">
                        <div class="bg-avenida-black/90 px-6 py-4">
                            <h2 class="text-lg font-medium text-white">Gestion de Categorias</h2>
                        </div>

                        <div class="p-6">
                            <!-- Input Nueva Categoria -->
                            <div class="flex gap-3 mb-8">
                                <input v-model="nuevaCategoria"
                                       class="flex-1 border rounded-md px-3 py-2"
                                       placeholder="Nueva categoria..."
                                       @keyup.enter="crearCategoria">
                                <button @click="crearCategoria"
                                        class="px-4 py-2 bg-avenida-green text-white rounded-md hover:bg-green-600 transition-colors">
                                    Agregar
                                </button>
                            </div>

                            <!-- Lista de Categorias -->
                            <div class="space-y-6">
                                <div v-for="categoria in categorias" 
                                     :key="categoria.categoria_id" 
                                     class="border rounded-lg">
                                    <!-- Header Categoria -->
                                    <div class="bg-gray-100 px-4 py-3 flex justify-between items-center">
                                        <div class="flex items-center gap-4">
                                            <div v-if="!categoria.editando">
                                                <h3 class="font-medium">{{ categoria.nombre }}</h3>
                                            </div>
                                            <div v-else class="flex gap-2">
                                                <input v-model="categoria.nombreTemp"
                                                       class="border rounded-md px-3 py-1"
                                                       @keyup.enter="guardarEdicionCategoria(categoria)">
                                                <button @click="guardarEdicionCategoria(categoria)"
                                                        class="text-green-600 hover:text-green-700">
                                                    Guardar
                                                </button>
                                            </div>
                                            <div v-if="!categoria.editando" class="flex gap-2">
                                                <button @click="iniciarEdicionCategoria(categoria)"
                                                        class="text-blue-600 text-sm hover:text-blue-700">
                                                    Editar
                                                </button>
                                                <button @click="eliminarCategoria(categoria)"
                                                        class="text-red-600 text-sm hover:text-red-700">
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                        <div class="flex gap-3">
                                            <input v-model="nuevasSubcategorias[categoria.categoria_id]"
                                                   class="border rounded-md px-3 py-1"
                                                   placeholder="Nueva subcategoria..."
                                                   @keyup.enter="crearSubcategoria(categoria)">
                                            <button @click="crearSubcategoria(categoria)"
                                                    class="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                                                Agregar
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Subcategorias -->
                                    <div class="p-4">
                                        <div class="grid grid-cols-2 gap-4">
                                            <div v-for="subcategoria in categoria.subcategorias"
                                                 :key="subcategoria.subcategoria_id"
                                                 class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                                <div v-if="!subcategoria.editando">
                                                    <span>{{ subcategoria.nombre }}</span>
                                                </div>
                                                <div v-else class="flex gap-2 flex-1">
                                                    <input v-model="subcategoria.nombreTemp"
                                                           class="border rounded-md px-3 py-1 flex-1"
                                                           @keyup.enter="guardarEdicionSubcategoria(categoria, subcategoria)">
                                                    <button @click="guardarEdicionSubcategoria(categoria, subcategoria)"
                                                            class="text-green-600 hover:text-green-700">
                                                        Guardar
                                                    </button>
                                                </div>
                                                <div v-if="!subcategoria.editando" class="flex gap-2">
                                                    <button @click="iniciarEdicionSubcategoria(subcategoria)"
                                                            class="text-blue-600 text-sm hover:text-blue-700">
                                                        Editar
                                                    </button>
                                                    <button @click="eliminarSubcategoria(categoria, subcategoria)"
                                                            class="text-red-600 text-sm hover:text-red-700">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Dialog, DialogPanel, TransitionRoot } from '@headlessui/vue'
import { useProductosStore } from '@/stores/productos'

const props = defineProps({
    show: Boolean
})

const emit = defineEmits(['close'])
const productosStore = useProductosStore()

const nuevaCategoria = ref('')
const nuevasSubcategorias = ref({})
const categorias = ref([])

const cargarCategorias = async () => {
    const cats = await productosStore.cargarCategorias()
    categorias.value = await Promise.all(cats.map(async cat => {
        const subs = await productosStore.cargarSubcategorias(cat.categoria_id)
        return {
            ...cat,
            editando: false,
            nombreTemp: cat.nombre,
            subcategorias: subs.map(sub => ({
                ...sub,
                editando: false,
                nombreTemp: sub.nombre
            }))
        }
    }))
}

const crearCategoria = async () => {
    if (!nuevaCategoria.value.trim()) return
    await productosStore.agregarCategoria({ nombre: nuevaCategoria.value })
    nuevaCategoria.value = ''
    await cargarCategorias()
}

const crearSubcategoria = async (categoria) => {
    const nombre = nuevasSubcategorias.value[categoria.categoria_id]
    if (!nombre?.trim()) return
    await productosStore.agregarSubcategoria({
        categoria_id: categoria.categoria_id,
        nombre
    })
    nuevasSubcategorias.value[categoria.categoria_id] = ''
    await cargarCategorias()
}

const iniciarEdicionCategoria = (categoria) => {
    categoria.editando = true
    categoria.nombreTemp = categoria.nombre
}

const guardarEdicionCategoria = async (categoria) => {
    if (!categoria.nombreTemp.trim()) return
    await productosStore.editarCategoria({
        categoria_id: categoria.categoria_id,
        nombre: categoria.nombreTemp
    })
    categoria.editando = false
    await cargarCategorias()
}

const iniciarEdicionSubcategoria = (subcategoria) => {
    subcategoria.editando = true
    subcategoria.nombreTemp = subcategoria.nombre
}

const guardarEdicionSubcategoria = async (categoria, subcategoria) => {
    if (!subcategoria.nombreTemp.trim()) return
    await productosStore.editarSubcategoria({
        subcategoria_id: subcategoria.subcategoria_id,
        nombre: subcategoria.nombreTemp
    })
    subcategoria.editando = false
    await cargarCategorias()
}

const eliminarCategoria = async (categoria) => {
    if (!confirm(` Esta seguro de eliminar la categoria ${categoria.nombre}?`)) return
    try {
        await productosStore.eliminarCategoria(categoria.categoria_id)
        await cargarCategorias()
    } catch (error) {
        alert(error.response?.data?.message || 'No se puede eliminar la categoria')
    }
}

const eliminarSubcategoria = async (categoria, subcategoria) => {
    if (!confirm(` Esta seguro de eliminar la subcategoria ${subcategoria.nombre}?`)) return
    try {
        await productosStore.eliminarSubcategoria(subcategoria.subcategoria_id)
        await cargarCategorias()
    } catch (error) {
        alert(error.response?.data?.message || 'No se puede eliminar la subcategoria')
    }
}

const handleClose = () => {
    emit('close')
}

onMounted(cargarCategorias)
</script>