<template>
    <div class="space-y-6">
        <!-- Header con acciones -->
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-avenida-black">Calendario de Eventos</h2>
            <button @click="openEventModal(null)"
                    class="px-4 py-2 bg-avenida-green text-white rounded-md hover:bg-green-600 transition-colors">
                Nuevo Evento
            </button>
        </div>

        <!-- Filtros -->
        <div class="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center space-x-2">
                <input type="checkbox"
                       id="showFeriados"
                       v-model="filters.showFeriados"
                       class="rounded text-avenida-green focus:ring-avenida-green">
                <label for="showFeriados" class="text-sm text-gray-600">Feriados</label>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox"
                       id="showEventos"
                       v-model="filters.showEventos"
                       class="rounded text-avenida-green focus:ring-avenida-green">
                <label for="showEventos" class="text-sm text-gray-600">Eventos</label>
            </div>
        </div>

        <!-- Calendario -->
        <div class="bg-white rounded-lg shadow">
            <FullCalendar ref="calendarRef"
                          :options="calendarOptions"
                          class="p-4" />
        </div>

        <!-- Modal de Evento -->
        <Dialog as="div" @close="closeEventModal" :open="isEventModalOpen" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                        <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                            {{ editingEvent ? 'Editar Evento' : 'Nuevo Evento' }}
                        </DialogTitle>

                        <form @submit.prevent="saveEvent" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre
                                </label>
                                <input type="text"
                                       v-model="eventForm.nombre"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo
                                </label>
                                <div class="flex items-center space-x-2">
                                    <select v-model="eventForm.tipo_id"
                                            required
                                            class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                                        <option value="">Seleccionar tipo</option>
                                        <option v-for="tipo in tiposEvento"
                                                :key="tipo.tipo_id"
                                                :value="tipo.tipo_id">
                                            {{ tipo.nombre }}
                                        </option>
                                    </select>
                                    <button type="button"
                                            @click="openTipoEventoModal()"
                                            class="text-avenida-green hover:text-green-600">
                                        <PlusIcon class="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Inicio
                                    </label>
                                    <input type="date"
                                           v-model="eventForm.fecha_inicio"
                                           required
                                           class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Fin
                                    </label>
                                    <input type="date"
                                           v-model="eventForm.fecha_fin"
                                           required
                                           class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea v-model="eventForm.descripcion"
                                          rows="3"
                                          class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"></textarea>
                            </div>

                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button"
                                        @click="closeEventModal"
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit"
                                        class="px-4 py-2 text-sm font-medium text-white bg-avenida-green rounded-md hover:bg-green-600">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>

        <!-- Modal de Tipo de Evento -->
        <TipoEventoModal :show="showTipoEventoModal"
                         :editing="editingTipoEvento"
                         @close="closeTipoEventoModal"
                         @save="saveTipoEvento" />
    </div>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
    import FullCalendar from '@fullcalendar/vue3'
    import dayGridPlugin from '@fullcalendar/daygrid'
    import interactionPlugin from '@fullcalendar/interaction'
    import esLocale from '@fullcalendar/core/locales/es'
    import { PlusIcon } from 'lucide-vue-next'
    import axios from 'axios'
    import TipoEventoModal from '../components/calendario/TipoEventoModal.vue'

    // Configuración de axios
    axios.defaults.baseURL = 'http://localhost:3000'

    // Estados para modales
    const isEventModalOpen = ref(false);
    const showTipoEventoModal = ref(false);
    const editingEvent = ref(null);
    const editingTipoEvento = ref(null);

    // Referencias y estados del calendario
    const calendarRef = ref(null)
    const eventos = ref([])
    const feriados = ref([])
    const tiposEvento = ref([])

    // Filtros
    const filters = ref({
        showFeriados: true,
        showEventos: true
    })

    // Formularios
    const eventForm = ref({
        nombre: '',
        tipo_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        descripcion: ''
    })

    // Computed para eventos del calendario
    const displayEvents = computed(() => {
        let events = []

        if (filters.value.showFeriados && Array.isArray(feriados.value)) {
            events = events.concat(feriados.value.map(f => ({
                title: f.motivo,
                start: f.fecha,
                end: f.fecha,
                classNames: ['feriado-event'],
                backgroundColor: '#EF4444',
                borderColor: '#EF4444'
            })) || [])
        }

        if (filters.value.showEventos && Array.isArray(eventos.value)) {
            events = events.concat(eventos.value.map(e => ({
                id: e.evento_id,
                title: e.nombre,
                start: e.fecha_inicio,
                end: e.fecha_fin,
                backgroundColor: e.color || '#10B981',
                borderColor: e.color || '#10B981',
                classNames: ['custom-event']
            })) || [])
        }

        return events
    })

    // Configuración del calendario
    const calendarOptions = computed(() => ({
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        locale: esLocale,
        events: displayEvents.value,
        height: 'auto',
        contentHeight: 600,
        dayMaxEventRows: 4,
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today'
        },
        eventClick: handleEventClick,
        dateClick: handleDateClick,
        eventDisplay: 'block'
    }))

    // Manejadores de eventos
    const handleEventClick = (info) => {
        const evento = eventos.value.find(e => e.evento_id === parseInt(info.event.id))
        if (evento) {
            openEventModal(evento)
        }
    }

    const handleDateClick = (info) => {
        eventForm.value.fecha_inicio = info.dateStr
        eventForm.value.fecha_fin = info.dateStr
        openEventModal()
    }

    // Funciones para modales
    const openEventModal = (event = null) => {
        if (event) {
            editingEvent.value = event;
            eventForm.value = { ...event };
        } else {
            editingEvent.value = null;
            eventForm.value = {
                nombre: '',
                tipo_id: '',
                fecha_inicio: '',
                fecha_fin: '',
                descripcion: ''
            };
        }
        isEventModalOpen.value = true;
    };

    const closeEventModal = () => {
        // Solo cerramos si no hay modal de tipo evento abierto
        if (!showTipoEventoModal.value) {
            isEventModalOpen.value = false;
            editingEvent.value = null;
        }
    };

    const openTipoEventoModal = (tipo = null) => {
        editingTipoEvento.value = tipo;
        showTipoEventoModal.value = true;
        // No cerramos el modal de evento
    };

    const closeTipoEventoModal = () => {
        showTipoEventoModal.value = false;
        editingTipoEvento.value = null;
    };

    // Funciones de guardado
    const saveEvent = async () => {
        try {
            if (editingEvent.value) {
                await axios.patch(
                    `/api/eventos/${editingEvent.value.evento_id}`,
                    eventForm.value,
                    { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
                )
            } else {
                await axios.post(
                    '/api/eventos',
                    eventForm.value,
                    { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
                )
            }
            await loadEvents()
            closeEventModal()
        } catch (error) {
            console.error('Error guardando evento:', error)
        }
    }

    const saveTipoEvento = async (tipoEvento) => {
        try {
            if (editingTipoEvento.value) {
                await axios.patch(
                    `/api/eventos/tipos/${editingTipoEvento.value.tipo_id}`,
                    tipoEvento
                );
            } else {
                await axios.post('/api/eventos/tipos', tipoEvento);
            }

            await loadEvents(); // Recargar eventos y tipos
            closeTipoEventoModal();
            // No cerramos el modal de evento
        } catch (error) {
            console.error('Error guardando tipo de evento:', error);
        }
    };

    // Carga de datos
    const loadEvents = async () => {
        try {
            const [eventosResponse, feriadosResponse, tiposResponse] = await Promise.allSettled([
                axios.get('/api/eventos'),
                axios.get('/api/feriados'),
                axios.get('/api/eventos/tipos')
            ]);

            eventos.value = Array.isArray(eventosResponse.value?.data) ? eventosResponse.value.data : [];
            feriados.value = Array.isArray(feriadosResponse.value?.data) ? feriadosResponse.value.data : [];
            tiposEvento.value = Array.isArray(tiposResponse.value?.data) ? tiposResponse.value.data : [];

            if (eventosResponse.status === 'rejected') {
                console.warn('Error cargando eventos:', eventosResponse.reason);
            }
            if (feriadosResponse.status === 'rejected') {
                console.warn('Error cargando feriados:', feriadosResponse.reason);
            }
            if (tiposResponse.status === 'rejected') {
                console.warn('Error cargando tipos:', tiposResponse.reason);
            }
        } catch (error) {
            console.error('Error general cargando datos:', error);
            eventos.value = [];
            feriados.value = [];
            tiposEvento.value = [];
        }
    };

    // Inicialización
    onMounted(() => {
        loadEvents()
    })
</script>

<style>
    .fc-event {
        cursor: pointer;
    }

    .feriado-event {
        font-style: italic;
    }

    .custom-event {
        font-weight: 500;
    }

    .fc .fc-button-primary {
        background-color: #10B981;
        border-color: #10B981;
    }

        .fc .fc-button-primary:hover {
            background-color: #059669;
            border-color: #059669;
        }

        .fc .fc-button-primary:disabled {
            background-color: #6EE7B7;
            border-color: #6EE7B7;
        }

    .fc .fc-daygrid-day.fc-day-today {
        background-color: #D1FAE5;
    }

    .fc-daygrid-day-frame {
        min-height: 70px !important;
    }

    .fc .fc-daygrid-day-top {
        padding: 2px !important;
    }

    .fc .fc-toolbar {
        font-size: 0.9em;
    }
</style>