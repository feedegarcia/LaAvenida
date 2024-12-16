const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Actualizar preferencias de orden
router.post('/orden-secciones/:usuario_id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { tipo, orden, sucursal_id, grupo_id } = req.body;

        // Manejar el caso especial de ORDEN_SUBCATEG
        if (tipo === 'ORDEN_SUBCATEG') {
            const [existingPrefs] = await connection.query(
                `SELECT preferencia_id 
                 FROM usuario_preferencias_orden 
                 WHERE usuario_id = ? 
                 AND tipo = ?`,
                [req.params.usuario_id, tipo]
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
                     VALUES (?, ?, ?)`,
                    [req.params.usuario_id, tipo, orden]
                );
            }
        } else {
            // El cÃ³digo existente para GRUPO
            const [existingPrefs] = await connection.query(
                `SELECT preferencia_id 
                 FROM usuario_preferencias_orden 
                 WHERE usuario_id = ? 
                 AND tipo = ?
                 AND sucursal_id = ?
                 AND grupo_id = ?`,
                [req.params.usuario_id, tipo, sucursal_id, grupo_id]
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
                     (usuario_id, tipo, sucursal_id, grupo_id, orden) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [req.params.usuario_id, tipo, sucursal_id, grupo_id, orden]
                );
            }
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

// Modificar tambiÃ©n la ruta GET para cargar las preferencias
router.get('/orden-secciones/:usuario_id', async (req, res) => {
    try {
        const { tipo } = req.query; // Agregar tipo como query parameter

        if (tipo === 'ORDEN_SUBCATEG') {
            // Para PedidosKanban
            const [preferences] = await pool.query(
                `SELECT orden 
                FROM usuario_preferencias_orden 
                WHERE usuario_id = ? 
                AND tipo = 'ORDEN_SUBCATEG'
                LIMIT 1`,
                [req.params.usuario_id]
            );
            res.json({
                orden: preferences.length > 0 ? preferences[0].orden : 0
            });
        } else {
            // Para NuevoPedido
            const [preferences] = await pool.query(
                `SELECT sucursal_id, grupo_id, orden 
                FROM usuario_preferencias_orden 
                WHERE usuario_id = ? 
                AND tipo = 'GRUPO'`,
                [req.params.usuario_id]
            );

            // Agrupar por sucursal_id
            const ordenPorSucursal = preferences.reduce((acc, pref) => {
                if (!acc[pref.sucursal_id]) {
                    acc[pref.sucursal_id] = [];
                }
                acc[pref.sucursal_id][pref.orden] = parseInt(pref.grupo_id);
                return acc;
            }, {});

            res.json(ordenPorSucursal);
        }
    } catch (error) {
        console.error('Error obteniendo preferencias:', error);
        res.status(500).json({
            message: 'Error al obtener preferencias',
            error: error.message
        });
    }
});

module.exports = router;