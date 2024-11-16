const pool = require('../config/database');

const getTiposEvento = async (req, res) => {
    try {
        const [tipos] = await pool.query('SELECT * FROM tipo_evento ORDER BY nombre');

        // Log para ver todos los tipos
        console.log('Tipos de evento:', tipos);

        res.json(tipos);
    } catch (error) {
        console.error('Error al obtener tipos de evento:', error.message);
        res.status(500).json({ error: error.message });
    }
};


const createTipoEvento = async (req, res) => {
    try {
        const { nombre, color } = req.body;
        const [result] = await pool.query(
            'INSERT INTO tipo_evento (nombre, color, afecta_prediccion, factor_ajuste) VALUES (?, ?, true, 1.0)',
            [nombre, color]
        );
        res.status(201).json({
            tipo_id: result.insertId,
            nombre,
            color
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteTipoEvento = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Check if there are events using this type
        const [events] = await connection.query(
            'SELECT COUNT(*) as count FROM evento WHERE tipo_id = ?',
            [id]
        );

        if (events[0].count > 0) {
            throw new Error('No se puede eliminar el tipo porque hay eventos asociados');
        }

        await connection.query('DELETE FROM tipo_evento WHERE tipo_id = ?', [id]);
        await connection.commit();

        res.json({ message: 'Tipo de evento eliminado exitosamente' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getTiposEvento,
    createTipoEvento,
    deleteTipoEvento
};