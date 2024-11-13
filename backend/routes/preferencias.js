const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Actualizar preferencias de orden
router.post('/orden-secciones/:usuario_id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { orden } = req.body;

        const [existingPrefs] = await connection.query(
            `SELECT preferencia_id 
             FROM usuario_preferencias_orden 
             WHERE usuario_id = ? 
             AND tipo = 'GRUPO'`,
            [req.params.usuario_id]
        );

        if (existingPrefs.length > 0) {
            await connection.query(
                `UPDATE usuario_preferencias_orden 
                 SET orden = ?
                 WHERE preferencia_id = ?`,
                [orden, existingPrefs[0].preferencia_id]
            );
        } else {
            await connection.query(
                `INSERT INTO usuario_preferencias_orden 
                 (usuario_id, tipo, orden) 
                 VALUES (?, 'GRUPO', ?)`,
                [req.params.usuario_id, orden]
            );
        }

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en guardar preferencias:', error);
        res.status(500).json({
            message: 'Error al guardar preferencias',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Obtener preferencias de orden
router.get('/orden-secciones/:usuario_id', async (req, res) => {
    try {
        const [preferencias] = await pool.query(
            `SELECT orden 
             FROM usuario_preferencias_orden 
             WHERE usuario_id = ? 
             AND tipo = 'GRUPO'`,
            [req.params.usuario_id]
        );

        res.json({
            orden: preferencias[0]?.orden || 0
        });
    } catch (error) {
        console.error('Error en obtener preferencias:', error);
        res.status(500).json({
            message: 'Error al obtener preferencias',
            error: error.message
        });
    }
});

module.exports = router;