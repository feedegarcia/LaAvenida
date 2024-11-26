const pool = require('../config/database');

// Primero definir todas las funciones
const getEventos = async (req, res) => {
    try {
        const [eventos] = await pool.query(`
            SELECT e.*, te.nombre as tipo_nombre, te.color
            FROM evento e
            LEFT JOIN tipo_evento te ON e.tipo_id = te.tipo_id
            ORDER BY e.fecha_inicio DESC
        `);
        res.json(eventos);
    } catch (error) {
        console.error('Error en getEventos:', error);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
};

const getTiposEvento = async (req, res) => {
    try {
        const [tiposEvento] = await pool.query('SELECT * FROM tipo_evento');
        res.json(tiposEvento);
    } catch (error) {
        console.error('Error en getTiposEvento:', error);
        res.status(500).json({ error: 'Error al obtener tipos de evento' });
    }
};

const createEvento = async (req, res) => {
    const { nombre, tipo_id, fecha_inicio, fecha_fin, descripcion } = req.body;

    if (!tipo_id) {
        return res.status(400).json({ error: 'El tipo de evento es requerido' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO evento (nombre, tipo_id, fecha_inicio, fecha_fin, descripcion) VALUES (?, ?, ?, ?, ?)',
            [nombre, tipo_id, fecha_inicio, fecha_fin, descripcion]
        );
        res.json({
            evento_id: result.insertId,
            message: 'Evento creado exitosamente'
        });
    } catch (error) {
        console.error('Error en createEvento:', error);
        res.status(500).json({ error: 'Error al crear evento' });
    }
};

const updateEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo_id, fecha_inicio, fecha_fin, descripcion } = req.body;
        await pool.query(
            `UPDATE evento 
             SET nombre = ?, tipo_id = ?, fecha_inicio = ?, fecha_fin = ?, descripcion = ?
             WHERE evento_id = ?`,
            [nombre, tipo_id, fecha_inicio, fecha_fin, descripcion, id]
        );
        res.json({ message: 'Evento actualizado exitosamente' });
    } catch (error) {
        console.error('Error en updateEvento:', error);
        res.status(500).json({ error: 'Error al actualizar evento' });
    }
};

const deleteEvento = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM evento WHERE evento_id = ?', [id]);
        res.json({ message: 'Evento eliminado exitosamente' });
    } catch (error) {
        console.error('Error en deleteEvento:', error);
        res.status(500).json({ error: 'Error al eliminar evento' });
    }
};

const createTipoEvento = async (req, res) => {
    try {
        const { nombre, color } = req.body;

        // Validacion de campos requeridos
        if (!nombre || !color) {
            return res.status(400).json({
                error: 'Nombre y color son campos requeridos',
                received: { nombre, color }
            });
        }
         

        const [result] = await pool.query(
            `INSERT INTO tipo_evento (nombre, color, afecta_prediccion, factor_ajuste) 
             VALUES (?, ?, true, 1.0)`,
            [nombre, color]
        );
         

        res.status(201).json({
            tipo_id: result.insertId,
            nombre,
            color
        });
    } catch (error) {
        console.error('Error detallado en createTipoEvento:', error);
        // Si es un error de duplicado (codigo 1062 en MySQL)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                error: 'Ya existe un tipo de evento con ese nombre'
            });
        }
        res.status(500).json({
            error: 'Error al crear el tipo de evento',
            details: error.message
        });
    }
};

// Luego exportar todas juntas
module.exports = {
    getEventos,
    getTiposEvento,
    createEvento,
    updateEvento,
    deleteEvento,
    createTipoEvento
};