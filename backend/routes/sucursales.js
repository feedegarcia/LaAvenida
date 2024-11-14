const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware de validación de sucursal
const validateSucursal = (req, res, next) => {
    const { nombre, direccion, telefono, tipo, horario_atencion } = req.body;
    if (!nombre || !direccion || !telefono || !tipo || !horario_atencion) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos',
            required: ['nombre', 'direccion', 'telefono', 'tipo', 'horario_atencion']
        });
    }
    if (!['FABRICA_VENTA', 'SOLO_VENTA'].includes(tipo)) {
        return res.status(400).json({
            message: 'Tipo de sucursal inválido',
            allowedTypes: ['FABRICA_VENTA', 'SOLO_VENTA']
        });
    }
    next();
};

// Obtener todas las sucursales
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [sucursales] = await pool.query('SELECT * FROM SUCURSAL ORDER BY nombre');
        res.json(sucursales);
    } catch (error) {
        console.error('Error en GET /sucursales:', error);
        res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
    }
});

// Obtener sucursales por usuario
router.get('/usuario/:userId', authenticateToken, async (req, res) => {
    try {
        const [sucursales] = await pool.query(`
            SELECT s.* 
            FROM SUCURSAL s
            JOIN usuario_sucursal us ON s.sucursal_id = us.sucursal_id
            WHERE us.usuario_id = ? AND us.activo = 1
            ORDER BY s.nombre
        `, [req.params.userId]);

        res.json(sucursales);
    } catch (error) {
        console.error('Error en GET /sucursales/usuario:', error);
        res.status(500).json({ message: 'Error al obtener sucursales del usuario', error: error.message });
    }
});

// Obtener sucursales activas
router.get('/activas', authenticateToken, async (req, res) => {
    try {
        const [sucursales] = await pool.query(
            'SELECT * FROM SUCURSAL WHERE activo = 1 ORDER BY nombre'
        );
        res.json(sucursales);
    } catch (error) {
        console.error('Error en GET /sucursales/activas:', error);
        res.status(500).json({ message: 'Error al obtener sucursales activas', error: error.message });
    }
});

// Obtener una sucursal específica
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [sucursales] = await pool.query(
            'SELECT * FROM SUCURSAL WHERE sucursal_id = ?',
            [req.params.id]
        );

        if (sucursales.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        res.json(sucursales[0]);
    } catch (error) {
        console.error('Error en GET /sucursales/:id:', error);
        res.status(500).json({ message: 'Error al obtener la sucursal', error: error.message });
    }
});

// Crear nueva sucursal
router.post('/', authenticateToken, validateSucursal, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { nombre, direccion, telefono, tipo, horario_atencion, latitud, longitud, zona_clima } = req.body;

        const [result] = await connection.query(
            `INSERT INTO SUCURSAL (
                empresa_id, 
                nombre, 
                direccion, 
                telefono, 
                tipo, 
                horario_atencion, 
                activo,
                latitud,
                longitud,
                zona_clima
            ) VALUES (?, ?, ?, ?, ?, ?, true, ?, ?, ?)`,
            [1, nombre, direccion, telefono, tipo, horario_atencion, latitud || null, longitud || null, zona_clima || null]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Sucursal creada exitosamente',
            sucursal_id: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en POST /sucursales:', error);
        res.status(500).json({ message: 'Error al crear sucursal', error: error.message });
    } finally {
        connection.release();
    }
});

// Actualizar sucursal
router.patch('/:id', authenticateToken, validateSucursal, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { nombre, direccion, telefono, tipo, horario_atencion, latitud, longitud, zona_clima } = req.body;

        // Verificar si la sucursal existe
        const [sucursal] = await connection.query(
            'SELECT sucursal_id FROM SUCURSAL WHERE sucursal_id = ?',
            [id]
        );

        if (sucursal.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        await connection.query(
            `UPDATE SUCURSAL 
             SET nombre = ?, 
                 direccion = ?, 
                 telefono = ?, 
                 tipo = ?, 
                 horario_atencion = ?,
                 latitud = ?,
                 longitud = ?,
                 zona_clima = ?
             WHERE sucursal_id = ?`,
            [nombre, direccion, telefono, tipo, horario_atencion, latitud || null, longitud || null, zona_clima || null, id]
        );

        await connection.commit();
        res.json({ message: 'Sucursal actualizada exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error en PATCH /sucursales/:id:', error);
        res.status(500).json({ message: 'Error al actualizar sucursal', error: error.message });
    } finally {
        connection.release();
    }
});

// Cambiar estado de sucursal
router.patch('/:id/status', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            await connection.rollback();
            return res.status(400).json({ message: 'El campo activo debe ser un booleano' });
        }

        // Verificar si la sucursal existe
        const [sucursal] = await connection.query(
            'SELECT sucursal_id FROM SUCURSAL WHERE sucursal_id = ?',
            [id]
        );

        if (sucursal.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Actualizar estado
        await connection.query(
            'UPDATE SUCURSAL SET activo = ? WHERE sucursal_id = ?',
            [activo, id]
        );

        // Si se está desactivando la sucursal, desactivar también las relaciones usuario-sucursal
        if (!activo) {
            await connection.query(
                'UPDATE usuario_sucursal SET activo = 0 WHERE sucursal_id = ?',
                [id]
            );
        }

        await connection.commit();
        res.json({
            message: `Sucursal ${activo ? 'activada' : 'desactivada'} exitosamente`,
            sucursal_id: id,
            activo: activo
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en PATCH /sucursales/:id/status:', error);
        res.status(500).json({ message: 'Error al cambiar estado de la sucursal', error: error.message });
    } finally {
        connection.release();
    }
});

// Obtener estadísticas de una sucursal
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener estadísticas básicas
        const [stats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT u.usuario_id) as total_usuarios,
                COUNT(DISTINCT p.pedido_id) as total_pedidos,
                COUNT(DISTINCT CASE WHEN p.estado = 'RECIBIDO' THEN p.pedido_id END) as pedidos_completados
            FROM SUCURSAL s
            LEFT JOIN usuario_sucursal us ON s.sucursal_id = us.sucursal_id
            LEFT JOIN USUARIO u ON us.usuario_id = u.usuario_id
            LEFT JOIN PEDIDO p ON s.sucursal_id = p.sucursal_destino
            WHERE s.sucursal_id = ?
            GROUP BY s.sucursal_id
        `, [id]);

        if (stats.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        res.json(stats[0]);
    } catch (error) {
        console.error('Error en GET /sucursales/:id/stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
});

module.exports = router;