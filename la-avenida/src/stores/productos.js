import { defineStore } from 'pinia'
import axiosInstance from '../utils/axios-config'
import { ref, computed } from 'vue'

export const useProductosStore = defineStore('productos', () => {
    // Estado
    const productos = ref([])
    const categorias = ref([])
    const subcategorias = ref([])
    const showModal = ref(false)
    const editingProducto = ref(null)
    const userRole = ref('')
    const loading = ref(false)
    const error = ref(null)

    // Filtros
    const filtros = ref({
        busqueda: '',
        categoria: '',
        estado: '',
        visibilidad: ''
    })

    // Getters
    const productosFiltrados = computed(() => {
        let resultado = [...productos.value]

        if (filtros.value.busqueda) {
            const busqueda = filtros.value.busqueda.toLowerCase()
            resultado = resultado.filter(p =>
                p.nombre.toLowerCase().includes(busqueda) ||
                p.codigo.toLowerCase().includes(busqueda)
            )
        }

        if (filtros.value.estado !== '') {
            const estadoActivo = filtros.value.estado === 'true'
            resultado = resultado.filter(p => p.activo === estadoActivo)
        }

        if (filtros.value.visibilidad !== '') {
            const visibleWeb = filtros.value.visibilidad === 'true'
            resultado = resultado.filter(p => p.visible_web === visibleWeb)
        }

        return resultado
    })

    // Acciones
    const cargarProductos = async () => {
        loading.value = true
        error.value = null
        try {
            const { data } = await axiosInstance.get('/api/productos/admin')
            productos.value = data
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al cargar productos: ' + error.message
                console.error('Error al cargar productos:', error)
            }
        } finally {
            loading.value = false
        }
    }

    const cargarCategorias = async () => {
        loading.value = true
        error.value = null
        try {
            const { data } = await axiosInstance.get('/api/productos/categorias')
            categorias.value = data
            return data
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al cargar categorias: ' + error.message
                console.error('Error al cargar categorias:', error)
            }
            return []
        } finally {
            loading.value = false
        }
    }

    const cargarSubcategorias = async (categoriaId) => {
        if (!categoriaId) return []
        loading.value = true
        error.value = null
        try {
            const { data } = await axiosInstance.get(`/api/productos/subcategorias/${categoriaId}`)
            subcategorias.value = data
            return data
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al cargar subcategorias: ' + error.message
                console.error('Error al cargar subcategorias:', error)
            }
            subcategorias.value = []
            return []
        } finally {
            loading.value = false
        }
    }

    const guardarProducto = async (producto) => {
        loading.value = true
        error.value = null
        try {
            if (editingProducto.value) {
                await axiosInstance.put(`/api/productos/${producto.producto_id}`, producto)
            } else {
                await axiosInstance.post('/api/productos', producto)
            }
            await cargarProductos()
            cerrarModal()
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al guardar producto: ' + error.message
                console.error('Error al guardar producto:', error)
                throw error
            }
        } finally {
            loading.value = false
        }
    }

    const toggleEstado = async (producto) => {
        loading.value = true
        error.value = null
        try {
            await axiosInstance.patch(`/api/productos/${producto.producto_id}/estado`, {
                activo: !producto.activo
            })
            await cargarProductos()
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al cambiar estado: ' + error.message
                console.error('Error al cambiar estado:', error)
            }
        } finally {
            loading.value = false
        }
    }

    const toggleVisibilidadWeb = async (producto) => {
        loading.value = true
        error.value = null
        try {
            await axiosInstance.patch(`/api/productos/${producto.producto_id}/visibilidad`, {
                visible_web: !producto.visible_web
            })
            await cargarProductos()
        } catch (error) {
            if (error.name !== 'AbortError') {
                error.value = 'Error al cambiar visibilidad web: ' + error.message
                console.error('Error al cambiar visibilidad web:', error)
            }
        } finally {
            loading.value = false
        }
    }

    const actualizarPreciosSubcategoria = async (subcategoriaId, precios) => {
        loading.value = true
        error.value = null
        try {
            await axiosInstance.patch(`/api/productos/subcategoria/${subcategoriaId}/precios`, precios)
            await cargarProductos()
        } catch (error) {
            error.value = 'Error al actualizar precios: ' + error.message
            console.error('Error al actualizar precios:', error)
            throw error
        } finally {
            loading.value = false
        }
    }
    const agregarCategoria = async (categoria) => {
        loading.value = true
        try {
            await axiosInstance.post('/api/productos/categorias', categoria)
            await cargarCategorias()
        } catch (error) {
            error.value = 'Error al crear categoria: ' + error.message
            throw error
        } finally {
            loading.value = false
        }
    }
    const editarCategoria = async (categoria) => {
        loading.value = true
        try {
            await axiosInstance.put(`/api/productos/categorias/${categoria.categoria_id}`, {
                nombre: categoria.nombre
            })
            await cargarCategorias()
        } catch (error) {
            error.value = 'Error al editar categoria: ' + error.message
            throw error
        } finally {
            loading.value = false
        }
    }
    const eliminarCategoria = async (categoriaId) => {
        loading.value = true
        error.value = null
        try {
            await axiosInstance.delete(`/api/productos/categorias/${categoriaId}`)
            await cargarCategorias()
        } catch (error) {
            console.error('Error al eliminar categoria:', error)
            throw error
        } finally {
            loading.value = false
        }
    }
    const editarSubcategoria = async (subcategoria) => {
        loading.value = true
        try {
            await axiosInstance.put(`/api/productos/subcategorias/${subcategoria.subcategoria_id}`, {
                nombre: subcategoria.nombre
            })
            await cargarCategorias()
        } catch (error) {
            error.value = 'Error al editar subcategoria: ' + error.message
            throw error
        } finally {
            loading.value = false
        }
    }
    const agregarSubcategoria = async (subcategoria) => {
        loading.value = true
        try {
            await axiosInstance.post('/api/productos/subcategorias', subcategoria)
            await cargarCategorias()
        } catch (error) {
            error.value = 'Error al crear subcategoria: ' + error.message
            throw error
        } finally {
            loading.value = false
        }
    }

    const eliminarSubcategoria = async (subcategoriaId) => {
        loading.value = true
        error.value = null
        try {
            await axiosInstance.delete(`/api/productos/subcategorias/${subcategoriaId}`)
            await cargarCategorias()
        } catch (error) {
            console.error('Error al eliminar subcategoria:', error)
            throw error
        } finally {
            loading.value = false
        }
    }
    const editarProducto = (producto) => {
        editingProducto.value = { ...producto }
        showModal.value = true
    }

    const cerrarModal = () => {
        showModal.value = false
        editingProducto.value = null
    }

    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor)
    }

    const verificarPermisos = (rol) => {
        userRole.value = rol
    }

    return {
        // Estado
        productos,
        categorias,
        subcategorias,
        showModal,
        editingProducto,
        filtros,
        userRole,
        loading,
        error,
        agregarCategoria,
        editarCategoria,
        editarSubcategoria,
        eliminarCategoria,
        agregarSubcategoria,
        eliminarSubcategoria,
        // Getters
        productosFiltrados,
        // Acciones
        cargarProductos,
        cargarCategorias,
        cargarSubcategorias,
        guardarProducto,
        toggleEstado,
        toggleVisibilidadWeb,
        editarProducto,
        cerrarModal,
        formatoMoneda,
        verificarPermisos,
        actualizarPreciosSubcategoria
    }
})