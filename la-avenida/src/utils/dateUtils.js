// src/utils/dateUtils.js
export const formatoFechaArgentina = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const formatoFechaHoraArgentina = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Función para obtener próxima fecha de entrega (miércoles o sábado)
export const obtenerProximaFechaEntrega = () => {
    const hoy = new Date();
    let fecha = new Date(hoy);

    // Si es después de las 11 AM, empezar desde mañana
    if (hoy.getHours() >= 11) {
        fecha.setDate(fecha.getDate() + 1);
    }

    // Buscar próximo miércoles (3) o sábado (6)
    while (true) {
        const dia = fecha.getDay();
        if (dia === 3 || dia === 6) {
            break;
        }
        fecha.setDate(fecha.getDate() + 1);
    }

    return fecha;
};