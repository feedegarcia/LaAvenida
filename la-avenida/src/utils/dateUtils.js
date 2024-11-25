// src/utils/dateUtils.js
export const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const formatearFechaCompleta = (fecha) => {
    if (!fecha) return 'Sin actualizaci�n';
    return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const obtenerProximaFechaEntrega = () => {
    const hoy = new Date();
    let fecha = new Date(hoy);

    // Si es despu�s de las 11 AM, empezar desde ma�ana
    if (hoy.getHours() >= 11) {
        fecha.setDate(fecha.getDate() + 1);
    }

    // Buscar pr�ximo mi�rcoles (3) o s�bado (6)
    while (fecha.getDay() !== 3 && fecha.getDay() !== 6) {
        fecha.setDate(fecha.getDate() + 1);
    }

    fecha.setHours(0, 0, 0, 0);
    return fecha;
};

export const formatearFechaParaMySQL = (fecha) => {
    if (!fecha) return null;
    const d = new Date(fecha);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};
// Funci�n para validar si una fecha es v�lida para entrega
export const esFechaEntregaValida = (fecha) => {
    const fechaObj = new Date(fecha);
    // Solo mi�rcoles (3) o s�bados (6)
    return fechaObj.getDay() === 3 || fechaObj.getDay() === 6;
};

// Funci�n para calcular d�as h�biles entre fechas
export const calcularDiasHabiles = (fechaInicio, fechaFin) => {
    let dias = 0;
    let actual = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    while (actual <= fin) {
        // Si es d�a h�bil (lunes a viernes)
        if (actual.getDay() !== 0 && actual.getDay() !== 6) {
            dias++;
        }
        actual.setDate(actual.getDate() + 1);
    }
    return dias;
};