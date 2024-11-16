<template>
    <div class="max-w-4xl mx-auto p-4">
        <!-- Contador de próximo feriado -->
        <NextFeriadoCounter />

        <!-- Filtros -->
        <div class="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg mb-6">
            <div class="flex items-center space-x-2">
                <input type="checkbox"
                       id="showEventos"
                       v-model="filters.showEventos"
                       class="rounded text-blue-500 focus:ring-blue-500">
                <label for="showEventos" class="text-sm text-gray-600">Eventos</label>
            </div>
        </div>

        <!-- Calendario -->
        <div class="bg-white rounded-lg shadow">
            <!-- Header del calendario -->
            <div class="flex items-center justify-between p-4 border-b">
                <button @click="cambiarMes(-1)"
                        class="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft class="w-5 h-5" />
                </button>

                <h2 class="text-lg font-semibold">
                    {{ new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentDate) }}
                </h2>

                <button @click="cambiarMes(1)"
                        class="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronRight class="w-5 h-5" />
                </button>
            </div>

            <!-- Grilla del calendario -->
            <div class="grid grid-cols-7 gap-px bg-gray-200">
                <!-- Días de la semana -->
                <div v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']"
                     :key="day"
                     class="bg-gray-50 p-2 text-center text-sm font-medium">
                    {{ day }}
                </div>

                <!-- Días del mes -->
                <div v-for="date in getDaysInMonth(currentDate)"
                     :key="date.toISOString()"
                     class="bg-white p-2 min-h-[80px] relative group">
                    <div class="flex justify-between items-start">
                        <span :class="[
                            'text-sm',
                            { 'text-red-500': date.getDay() === 0 }
                        ]">
                            {{ date.getDate() }}
                        </span>
                        <button v-if="getEventosDelDia(date).length > 0"
                                class="p-1 hover:bg-gray-100 rounded-full">
                            <Info class="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <!-- Eventos del día -->
                    <div v-for="evento in getEventosDelDia(date)"
                         :key="evento.evento_id"
                         class="text-xs mt-1 p-1 rounded flex justify-between items-center"
                         :style="{ backgroundColor: evento.color + '20', color: evento.color }">
                        <span class="truncate">{{ evento.nombre }}</span>
                        <div class="flex items-center space-x-1">
                            <button @click.stop="openDeleteModal(evento)"
                                    class="ml-1 text-gray-500 hover:text-gray-700">
                                <Trash2 class="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <!-- Botón para agregar evento -->
                    <button class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                            @click="openEventModal(date)">
                        <Plus class="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de nuevo evento -->
        <Dialog :open="isEventModalOpen" @close="closeModal" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                        <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Nuevo Evento
                        </DialogTitle>

                        <form @submit.prevent="saveEvent" class="space-y-4">
                            <!-- Nombre -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre
                                </label>
                                <input type="text"
                                       v-model="eventForm.nombre"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm">
                            </div>

                            <!-- Tipo -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Evento
                                </label>
                                <div class="flex items-center gap-2">
                                    <select v-model="eventForm.tipo_id"
                                            required
                                            class="w-full rounded-md border-gray-300 shadow-sm">
                                        <option value="">Seleccione un tipo</option>
                                        <option v-for="tipo in tiposEvento"
                                                :key="tipo.tipo_id"
                                                :value="tipo.tipo_id">
                                            {{ tipo.nombre }}
                                        </option>
                                    </select>
                                    <div class="flex gap-2">
                                        <button type="button"
                                                @click="openNewTipoModal"
                                                class="px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600">
                                            <Plus class="w-4 h-4" />
                                        </button>
                                        <button type="button"
                                                @click="deleteTipoEvento"
                                                :disabled="!eventForm.tipo_id"
                                                class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Checkbox para múltiples días -->
                            <div class="flex items-center space-x-2">
                                <input type="checkbox"
                                       id="multipleDays"
                                       v-model="isMultipleDays"
                                       class="rounded border-gray-300 text-emerald-500">
                                <label for="multipleDays" class="text-sm text-gray-600">
                                    Evento de múltiples días
                                </label>
                            </div>

                            <!-- Fecha inicio -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Inicio
                                </label>
                                <input type="date"
                                       v-model="eventForm.fecha_inicio"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm">
                            </div>

                            <!-- Fecha fin (condicional) -->
                            <div v-if="isMultipleDays">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Fin
                                </label>
                                <input type="date"
                                       v-model="eventForm.fecha_fin"
                                       :min="eventForm.fecha_inicio"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm">
                            </div>

                            <!-- Descripción -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea v-model="eventForm.descripcion"
                                          rows="3"
                                          class="w-full rounded-md border-gray-300 shadow-sm"></textarea>
                            </div>

                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button"
                                        @click="closeModal"
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit"
                                        class="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>

        <!-- Modal de confirmación de eliminación -->
        <Dialog :open="isDeleteModalOpen" @close="closeDeleteModal" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                        <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Confirmar Eliminación
                        </DialogTitle>
                        <p class="text-sm text-gray-500">
                            ¿Está seguro que desea eliminar este evento?
                        </p>
                        <div class="mt-4 flex justify-end space-x-3">
                            <button @click="closeDeleteModal"
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button @click="eliminarEvento"
                                    class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Eliminar
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>

        <!-- Modal de Tipo de Evento -->
        <TipoEventoModal :show="showTipoModal"
                         @close="showTipoModal = false"
                         @saved="handleTipoEventoSaved" />
    </div>
</template>
<script setup>
    import { ref, onMounted } from 'vue';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
    import { ChevronLeft, ChevronRight, X, Info, Plus, Trash2 } from 'lucide-vue-next';
    import axios from 'axios';
    import NextFeriadoCounter from './NextFeriadoCounter.vue';
    import TipoEventoModal from './TipoEventoModal.vue';

    // Estados
    const currentDate = ref(new Date());
    const eventos = ref([]);
    const tiposEvento = ref([]);
    const isEventModalOpen = ref(false);
    const isDeleteModalOpen = ref(false);
    const selectedEventForDelete = ref(null);
    const showTipoModal = ref(false);
    const isMultipleDays = ref(false);

    // Filtros
    const filters = ref({
        showEventos: true
    });

    // Formulario para eventos
    const eventForm = ref({
        nombre: '',
        tipo_id: null,
        fecha_inicio: '',
        fecha_fin: '',
        descripcion: ''
    });

    // Funciones del calendario
    const cambiarMes = (delta) => {
        const newDate = new Date(currentDate.value);
        newDate.setMonth(newDate.getMonth() + delta);
        currentDate.value = newDate;
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const getEventosDelDia = (date) => {
        if (!filters.value.showEventos) return [];

        return eventos.value.filter(e => {
            const fechaEvento = new Date(e.fecha_inicio);
            const fechaFin = new Date(e.fecha_fin);
            const fechaActual = new Date(date);

            // Normalizar las fechas
            fechaEvento.setHours(0, 0, 0, 0);
            fechaFin.setHours(0, 0, 0, 0);
            fechaActual.setHours(0, 0, 0, 0);

            return fechaActual >= fechaEvento && fechaActual <= fechaFin;
        });
    };

    // Funciones de eventos
    const cargarEventos = async () => {
        try {
            const response = await axios.get('/api/eventos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            eventos.value = response.data;
        } catch (error) {
            console.error('Error cargando eventos:', error);
        }
    };

    const cargarTiposEvento = async () => {
        try {
            const response = await axios.get('/api/eventos/tipos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            tiposEvento.value = response.data;
        } catch (error) {
            console.error('Error cargando tipos de evento:', error);
        }
    };

    // Funciones de modales
    const openEventModal = (date = null) => {
        const formattedDate = date ? date.toISOString().split('T')[0] : '';

        eventForm.value = {
            nombre: '',
            tipo_id: null,
            fecha_inicio: formattedDate,
            fecha_fin: formattedDate,
            descripcion: ''
        };

        isEventModalOpen.value = true;
    };

    const closeModal = () => {
        isEventModalOpen.value = false;
        isMultipleDays.value = false;
        eventForm.value = {
            nombre: '',
            tipo_id: null,
            fecha_inicio: '',
            fecha_fin: '',
            descripcion: ''
        };
    };

    const saveEvent = async () => {
        try {
            const eventoData = {
                nombre: eventForm.value.nombre,
                tipo_id: eventForm.value.tipo_id,
                fecha_inicio: eventForm.value.fecha_inicio,
                fecha_fin: isMultipleDays.value ? eventForm.value.fecha_fin : eventForm.value.fecha_inicio,
                descripcion: eventForm.value.descripcion
            };

            await axios.post('/api/eventos', eventoData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            await cargarEventos();
            closeModal();
        } catch (error) {
            console.error('Error al guardar evento:', error);
        }
    };

    const openNewTipoModal = () => {
        showTipoModal.value = true;
    };

    const handleTipoEventoSaved = async () => {
        await cargarTiposEvento();
        showTipoModal.value = false;
    };

    const deleteTipoEvento = async () => {
        if (!eventForm.value.tipo_id) {
            alert('Por favor seleccione un tipo de evento para eliminar');
            return;
        }

        if (!confirm('¿Está seguro que desea eliminar este tipo de evento? Si hay eventos asociados, no se podrá eliminar.')) {
            return;
        }

        try {
            await axios.delete(`/api/eventos/tipos/${eventForm.value.tipo_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            await cargarTiposEvento();
            eventForm.value.tipo_id = '';
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert(error.response?.data?.error || 'Error al eliminar el tipo de evento');
        }
    };

    const openDeleteModal = (evento) => {
        selectedEventForDelete.value = evento;
        isDeleteModalOpen.value = true;
    };

    const closeDeleteModal = () => {
        selectedEventForDelete.value = null;
        isDeleteModalOpen.value = false;
    };

    const eliminarEvento = async () => {
        try {
            await axios.delete(`/api/eventos/${selectedEventForDelete.value.evento_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            await cargarEventos();
            closeDeleteModal();
        } catch (error) {
            console.error('Error al eliminar evento:', error);
        }
    };

    // Inicialización
    onMounted(async () => {
        await Promise.all([
            cargarEventos(),
            cargarTiposEvento()
        ]);
    });
</script>