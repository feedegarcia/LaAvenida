const axios = require('axios');
const pool = require('../database');

const getFeriados = async (req, res) => {
    try {
        // Primero intentamos obtener los feriados de nuestra base de datos
        const [feriadosDB] = await pool.query(
            'SELECT * FROM feriados_api WHERE YEAR(fecha) = YEAR(CURRENT_DATE()) ORDER BY fecha'
        );

        if (feriadosDB.length === 0) {
            const currentYear = new Date().getFullYear();
            try {
                // Intentamos obtener de la API externa
                const response = await axios.get(`http://nolaborables.com.ar/api/v2/feriados/${currentYear}`);

                if (!response.data || !Array.isArray(response.data)) {
                    throw new Error('Formato de respuesta inválido de la API de feriados');
                }

                const feriadosToInsert = response.data.map(feriado => [
                    `${currentYear}-${feriado.mes.toString().padStart(2, '0')}-${feriado.dia.toString().padStart(2, '0')}`,
                    feriado.motivo,
                    feriado.tipo || 'inamovible',
                    true,
                    'API'
                ]);

                if (feriadosToInsert.length > 0) {
                    await pool.query(
                        `INSERT INTO feriados_api (fecha, motivo, tipo, es_nacional, origen) 
                         VALUES ?`,
                        [feriadosToInsert]
                    );
                }

                const [newFeriados] = await pool.query(
                    'SELECT * FROM feriados_api WHERE YEAR(fecha) = ? ORDER BY fecha',
                    [currentYear]
                );

                return res.json(newFeriados);
            } catch (apiError) {
                console.error('Error obteniendo feriados de la API:', apiError);
                // Si falla la API, intentamos devolver feriados por defecto
                const feriadosDefault = [
                    // Feriados inamovibles más importantes
                    { fecha: `${currentYear}-01-01`, motivo: 'Año Nuevo', tipo: 'inamovible', es_nacional: true },
                    { fecha: `${currentYear}-05-01`, motivo: 'Día del Trabajador', tipo: 'inamovible', es_nacional: true },
                    { fecha: `${currentYear}-07-09`, motivo: 'Día de la Independencia', tipo: 'inamovible', es_nacional: true },
                    { fecha: `${currentYear}-12-25`, motivo: 'Navidad', tipo: 'inamovible', es_nacional: true },
                ];

                // Insertamos los feriados por defecto
                const feriadosToInsert = feriadosDefault.map(f => [
                    f.fecha,
                    f.motivo,
                    f.tipo,
                    f.es_nacional,
                    'DEFAULT'
                ]);

                await pool.query(
                    `INSERT INTO feriados_api (fecha, motivo, tipo, es_nacional, origen) 
                     VALUES ?`,
                    [feriadosToInsert]
                );

                return res.json(feriadosDefault);
            }
        }

        res.json(feriadosDB);
    } catch (error) {
        console.error('Error en getFeriados:', error);
        res.status(500).json({
            error: 'Error al obtener los feriados',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const toggleFeriado = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                error: 'El campo activo debe ser un booleano'
            });
        }

        const [result] = await pool.query(
            'UPDATE feriados_api SET activo = ? WHERE feriado_id = ?',
            [activo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Feriado no encontrado'
            });
        }

        res.json({
            message: 'Feriado actualizado correctamente',
            feriado_id: id,
            activo: activo
        });
    } catch (error) {
        console.error('Error en toggleFeriado:', error);
        res.status(500).json({
            error: 'Error al actualizar el feriado',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getFeriados,
    toggleFeriado
};