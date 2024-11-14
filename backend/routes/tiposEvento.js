const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Obtener todos los tipos
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [tipos] = await pool.query('SELECT * FROM tipo_evento ORDER BY nombre');
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo tipo
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { nombre, color } = req.body;
        const [result] = await pool.query(
            'INSERT INTO tipo_evento (nombre, color, afecta_prediccion, factor_ajuste) VALUES (?, ?, true, 1.0)',
            [nombre, color]
        );
        res.json({
            tipo_id: result.insertId,
            nombre,
            color
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar tipo
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, color } = req.body;
        await pool.query(
            'UPDATE tipo_evento SET nombre = ?, color = ? WHERE tipo_id = ?',
            [nombre, color, id]
        );
        res.json({ message: 'Tipo de evento actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
