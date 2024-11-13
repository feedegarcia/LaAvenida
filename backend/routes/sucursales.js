const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener todas las sucursales
router.get('/', async (req, res) => {
    try {
        const [sucursales] = await pool.query('SELECT * FROM SUCURSAL');
        res.json(sucursales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Crear nueva sucursal
router.post('/', async (req, res) => {
    try {
        const { nombre, direccion, telefono, tipo, horario_atencion } = req.body;
        const [result] = await pool.query(
            `INSERT INTO SUCURSAL (
                empresa_id, 
                nombre, 
                direccion, 
                telefono, 
                tipo, 
                horario_atencion, 
                activo
            ) VALUES (?, ?, ?, ?, ?, ?, true)`,
            [1, nombre, direccion, telefono, tipo, horario_atencion] // 1 es el ID de tu empresa
        );
        res.status(201).json({ message: 'Sucursal creada exitosamente', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Actualizar sucursal
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, telefono, tipo, horario_atencion } = req.body;
        await pool.query(
            `UPDATE SUCURSAL 
             SET nombre = ?, direccion = ?, telefono = ?, 
                 tipo = ?, horario_atencion = ?
             WHERE sucursal_id = ?`,
            [nombre, direccion, telefono, tipo, horario_atencion, id]
        );
        res.json({ message: 'Sucursal actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Cambiar estado de sucursal
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        await pool.query(
            'UPDATE SUCURSAL SET activo = ? WHERE sucursal_id = ?',
            [activo, id]
        );
        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;