const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Obtener todos los pedidos
router.get('/', async (req, res) => {
    try {
        const [pedidos] = await pool.query(`
            SELECT 
                p.pedido_id,
                p.sucursal_origen,
                p.sucursal_destino,
                p.fecha_pedido,
                p.fecha_entrega_requerida,
                p.fecha_entrega_real,
                p.tipo,
                p.estado,
                p.notas,
                so.nombre as origen,
                sd.nombre as destino,
                COALESCE((
                    SELECT SUM(dp.cantidad_solicitada * dp.precio_unitario)
                    FROM detalle_pedido dp
                    WHERE dp.pedido_id = p.pedido_id
                ), 0) as total_pedido,
                EXISTS(
                    SELECT 1 
                    FROM solicitud_modificacion_pedido smp 
                    WHERE smp.pedido_id = p.pedido_id 
                    AND smp.estado = 'PENDIENTE'
                ) as tiene_solicitud_pendiente
            FROM pedido p
            JOIN sucursal so ON p.sucursal_origen = so.sucursal_id
            JOIN sucursal sd ON p.sucursal_destino = sd.sucursal_id
            ORDER BY p.fecha_pedido DESC
        `);

        res.json(pedidos);
    } catch (error) {
        console.error('Error en GET /pedidos:', error);
        res.status(500).json({
            message: 'Error al obtener pedidos',
            error: error.message
        });
    }
});

// Obtener detalle de un pedido específico
router.get('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener el pedido
        const [pedido] = await connection.query(`
    SELECT 
        p.*,
        so.nombre as origen,
        sd.nombre as destino,
        dp.detalle_id,
        dp.cantidad_solicitada,
        dp.cantidad_confirmada,
        dp.precio_unitario,
        dp.modificado,
        dp.modificado_por_sucursal,
        prod.producto_id,
        prod.nombre as producto_nombre
    FROM pedido p
    JOIN sucursal so ON p.sucursal_origen = so.sucursal_id
    JOIN sucursal sd ON p.sucursal_destino = sd.sucursal_id
    JOIN detalle_pedido dp ON p.pedido_id = dp.pedido_id
    JOIN producto prod ON dp.producto_id = prod.producto_id
    WHERE p.pedido_id = ?
`, [req.params.id]);    

        if (!pedido.length) {
            await connection.commit();
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        // Obtener los detalles del pedido
        const [detalles] = await connection.query(`
            SELECT 
                dp.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo
            FROM detalle_pedido dp
            JOIN producto p ON dp.producto_id = p.producto_id
            WHERE dp.pedido_id = ?
        `, [req.params.id]);

        pedido[0].detalles = detalles;

        await connection.commit();
        res.json(pedido[0]);

    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener pedido',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Crear nuevo pedido
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            sucursal_origen,
            sucursal_destino,
            fecha_entrega_requerida,
            tipo = 'PEDIDO_FABRICA',
            detalles,
            notas
        } = req.body;

        const [result] = await connection.query(
            `INSERT INTO pedido (
                sucursal_origen,
                sucursal_destino,
                fecha_pedido,
                fecha_entrega_requerida,
                tipo,
                estado,
                notas
            ) VALUES (?, ?, NOW(), ?, ?, 'EN_FABRICA', ?)`,
            [sucursal_origen, sucursal_destino, fecha_entrega_requerida, tipo, notas]
        );

        const pedidoId = result.insertId;

        for (const detalle of detalles) {
            await connection.query(
                `INSERT INTO detalle_pedido (
                    pedido_id,
                    producto_id,
                    cantidad_solicitada,
                    precio_unitario
                ) VALUES (?, ?, ?, ?)`,
                [pedidoId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
            );
        }

        await connection.commit();
        res.status(201).json({
            message: 'Pedido creado exitosamente',
            pedido_id: pedidoId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creando pedido:', error);
        res.status(500).json({
            message: 'Error al crear pedido',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Actualizar estado del pedido
router.patch('/:id/estado', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { estado, detalles, notas } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        // Obtener información del pedido actual
        const [pedidoActual] = await connection.query(
            'SELECT estado FROM pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        if (!pedidoActual.length) {
            throw new Error('Pedido no encontrado');
        }

        // Si hay modificaciones en los detalles
        if (detalles?.length > 0) {
            // Insertar en historial
            const [historial] = await connection.query(
                `INSERT INTO historial_pedido (
                    pedido_id, estado_anterior, estado_nuevo, 
                    usuario_id, notas, fecha
                ) VALUES (?, ?, ?, ?, ?, NOW())`,
                [req.params.id, pedidoActual[0].estado, estado, decodedToken.id, notas]
            );

            // Registrar cambios en detalles
            for (const detalle of detalles) {
                await connection.query(
                    `INSERT INTO detalle_cambio (
                        historial_id, detalle_id, 
                        cantidad_anterior, cantidad_nueva
                    ) VALUES (?, ?, ?, ?)`,
                    [historial.insertId, detalle.detalle_id, detalle.cantidad_anterior, detalle.cantidad_nueva]
                );

                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_confirmada = ?,
                         modificado = TRUE
                     WHERE detalle_id = ?`,
                    [detalle.cantidad_nueva, detalle.detalle_id]
                );
            }
        }

        // Actualizar estado del pedido
        await connection.query(
            'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
            [estado, req.params.id]
        );

        await connection.commit();
        res.json({ message: 'Estado actualizado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error en actualización de estado:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Obtener historial del pedido
router.get('/:id/historial', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Obtener el historial básico con información del usuario
        const [historial] = await connection.query(`
            SELECT 
                h.historial_id,
                h.pedido_id,
                h.estado_anterior,
                h.estado_nuevo,
                h.fecha,
                h.notas,
                h.usuario_id,
                u.nombre as usuario_nombre
            FROM historial_pedido h
            LEFT JOIN usuario u ON h.usuario_id = u.usuario_id
            WHERE h.pedido_id = ?
            ORDER BY h.fecha DESC
        `, [req.params.id]);

        // Obtener los cambios de detalle para cada entrada del historial
        for (const entrada of historial) {
            const [cambios] = await connection.query(`
                SELECT 
                    dc.detalle_id,
                    dc.cantidad_anterior,
                    dc.cantidad_nueva,
                    p.nombre as producto_nombre
                FROM detalle_cambio dc
                JOIN detalle_pedido dp ON dc.detalle_id = dp.detalle_id
                JOIN producto p ON dp.producto_id = p.producto_id
                WHERE dc.historial_id = ?
            `, [entrada.historial_id]);

            entrada.cambios = cambios;
        }

        res.json(historial);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({
            message: 'Error al obtener historial',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;