const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

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

// Obtener todos los pedidos
router.get('/', async (req, res) => {
    try {
        const [pedidos] = await pool.query(`
            SELECT p.*, 
                   EXISTS(
                       SELECT 1 
                       FROM solicitud_modificacion_pedido smp 
                       WHERE smp.pedido_id = p.pedido_id 
                       AND smp.estado = 'PENDIENTE'
                   ) as tiene_solicitud_pendiente
            FROM vw_pedidos_seguimiento p
            ORDER BY p.fecha_pedido DESC
        `);

        res.json(pedidos);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener pedidos',
            error: error.message
        });
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
            'SELECT estado, sucursal_origen FROM pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        if (!pedidoActual.length) {
            throw new Error('Pedido no encontrado');
        }

        // Obtener información de la sucursal del usuario
        const [userSucursal] = await connection.query(`
            SELECT s.*, us.sucursal_id 
            FROM usuario_sucursal us 
            JOIN sucursal s ON us.sucursal_id = s.sucursal_id 
            WHERE us.usuario_id = ? AND us.activo = 1`,
            [decodedToken.id]
        );

        const esSucursalOrigen = userSucursal.some(s =>
            s.sucursal_id === pedidoActual[0].sucursal_origen
        );

        // Si hay detalles modificados
        if (detalles?.length > 0) {
            // Insertar en historial
            const [historial] = await connection.query(
                `INSERT INTO historial_pedido (
                    pedido_id, estado_anterior, estado_nuevo, 
                    usuario_id, notas, fecha,
                    sucursal_id
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
                [
                    req.params.id,
                    pedidoActual[0].estado,
                    esSucursalOrigen ? pedidoActual[0].estado : estado,
                    decodedToken.id,
                    notas,
                    userSucursal[0].sucursal_id
                ]
            );

            // Actualizar detalles
            for (const detalle of detalles) {
                // Registrar cambio
                await connection.query(
                    `INSERT INTO detalle_cambio (
                        historial_id, detalle_id, 
                        cantidad_anterior, cantidad_nueva
                    ) VALUES (?, ?, ?, ?)`,
                    [historial.insertId, detalle.detalle_id, detalle.cantidad_anterior, detalle.cantidad_nueva]
                );

                // Actualizar cantidad
                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_confirmada = ?,
                         modificado = TRUE,
                         modificado_por_sucursal = ?,
                         fecha_modificacion = NOW()
                     WHERE detalle_id = ?`,
                    [detalle.cantidad_nueva, userSucursal[0].sucursal_id, detalle.detalle_id]
                );
            }

            // Solo actualizar estado si no es la sucursal origen
            if (!esSucursalOrigen) {
                await connection.query(
                    'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                    [estado, req.params.id]
                );
            }
        } else {
            // Si no hay modificaciones, solo cambio de estado
            await connection.query(
                'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                [estado, req.params.id]
            );
        }

        await connection.commit();
        res.json({
            message: 'Pedido actualizado exitosamente',
            estado: esSucursalOrigen ? pedidoActual[0].estado : estado
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error en actualización de pedido:', error);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    } finally {
        connection.release();
    }
});

// Obtener historial de cambios
router.get('/:id/historial', async (req, res) => {
    try {
        const [historial] = await pool.query(`
            SELECT h.*,
                   u.nombre as usuario,
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'detalle_id', dc.detalle_id,
                           'cantidad_anterior', dc.cantidad_anterior,
                           'cantidad_nueva', dc.cantidad_nueva
                       )
                   ) as cambios
            FROM historial_pedido h
            LEFT JOIN usuario u ON h.usuario_id = u.usuario_id
            LEFT JOIN detalle_cambio dc ON h.historial_id = dc.historial_id
            WHERE h.pedido_id = ?
            GROUP BY h.historial_id
            ORDER BY h.fecha DESC
        `, [req.params.id]);

        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener detalle de un pedido específico
router.get('/:id', async (req, res) => {
    try {
        const [pedido] = await pool.query(`
            SELECT 
                p.*,
                so.nombre as sucursal_origen_nombre,
                so.color as sucursal_origen_color,
                sd.nombre as sucursal_destino_nombre,
                sd.color as sucursal_destino_color
            FROM pedido p
            JOIN sucursal so ON p.sucursal_origen = so.sucursal_id
            JOIN sucursal sd ON p.sucursal_destino = sd.sucursal_id
            WHERE p.pedido_id = ?
        `, [req.params.id]);

        if (pedido.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        const [detalles] = await pool.query(`
            SELECT 
                dp.*,
                pr.nombre as producto_nombre,
                pr.codigo as producto_codigo,
                cp.nombre as categoria_nombre,
                cp.categoria_id,
                sp.nombre as subcategoria_nombre,
                sp.subcategoria_id,
                s.nombre as modificado_por_nombre,
                s.color as modificado_por_color
            FROM detalle_pedido dp
            JOIN producto pr ON dp.producto_id = pr.producto_id
            JOIN subcategoria_producto sp ON pr.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            LEFT JOIN sucursal s ON dp.modificado_por_sucursal = s.sucursal_id
            WHERE dp.pedido_id = ?
            ORDER BY cp.nombre, sp.nombre, pr.nombre
        `, [req.params.id]);

        // Formatear los datos de modificación
        const detallesFormateados = detalles.map(detalle => ({
            ...detalle,
            modificado_por: detalle.modificado_por_sucursal ? {
                nombre: detalle.modificado_por_nombre,
                color: detalle.modificado_por_color
            } : null
        }));

        res.json({
            ...pedido[0],
            detalles: detallesFormateados
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener detalle del pedido',
            error: error.message
        });
    }
});
// Rutas de borradores
router.post('/borrador', async (req, res) => {
    try {
        const { sucursal_id, usuario_id, fecha_entrega_requerida, detalles, notas } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO borrador_pedido 
                (sucursal_id, usuario_id, fecha_entrega_requerida, notas, estado) 
                VALUES (?, ?, ?, ?, 'ACTIVO')`,
                [sucursal_id, usuario_id, fecha_entrega_requerida, notas]
            );

            const borrador_id = result.insertId;

            for (const detalle of detalles) {
                await connection.query(
                    `INSERT INTO detalle_borrador 
                    (borrador_id, producto_id, cantidad, precio_unitario) 
                    VALUES (?, ?, ?, ?)`,
                    [borrador_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: 'Borrador creado exitosamente',
                borrador_id
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error en creación de borrador:', error);
        res.status(500).json({
            message: 'Error al crear el borrador',
            error: error.message
        });
    }
});

// Obtener borradores activos
router.get('/borradores', async (req, res) => {
    try {
        const [borradores] = await pool.query(`
            SELECT bp.*, 
                   s.nombre as sucursal_nombre,
                   u.nombre as usuario_nombre
            FROM borrador_pedido bp
            JOIN sucursal s ON bp.sucursal_id = s.sucursal_id
            JOIN usuario u ON bp.usuario_id = u.usuario_id
            WHERE bp.estado = 'ACTIVO'
            ORDER BY bp.fecha_creacion DESC
        `);

        for (let borrador of borradores) {
            const [detalles] = await pool.query(`
                SELECT db.*,
                       p.nombre as producto_nombre,
                       p.codigo as producto_codigo
                FROM detalle_borrador db
                JOIN producto p ON db.producto_id = p.producto_id
                WHERE db.borrador_id = ?
            `, [borrador.borrador_id]);

            borrador.detalles = detalles;
        }

        res.json(borradores);
    } catch (error) {
        console.error('Error obteniendo borradores:', error);
        res.status(500).json({
            message: 'Error al obtener borradores',
            error: error.message
        });
    }
});

// Activar/desactivar borrador
router.patch('/borrador/:id/estado', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { estado } = req.body;
        await connection.query(
            'UPDATE borrador_pedido SET estado = ? WHERE borrador_id = ?',
            [estado, req.params.id]
        );

        await connection.commit();
        res.json({ message: 'Estado del borrador actualizado' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Convertir borrador en pedido
router.post('/borrador/:id/confirmar', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener datos del borrador
        const [borrador] = await connection.query(
            'SELECT * FROM borrador_pedido WHERE borrador_id = ?',
            [req.params.id]
        );

        if (!borrador.length) {
            return res.status(404).json({ message: 'Borrador no encontrado' });
        }

        // Crear pedido desde borrador
        const [result] = await connection.query(
            `INSERT INTO pedido (
                sucursal_origen,
                fecha_pedido,
                fecha_entrega_requerida,
                estado,
                notas
            ) VALUES (?, NOW(), ?, 'EN_FABRICA', ?)`,
            [borrador[0].sucursal_id, borrador[0].fecha_entrega_requerida, borrador[0].notas]
        );

        const pedidoId = result.insertId;

        // Transferir detalles
        const [detalles] = await connection.query(
            'SELECT * FROM detalle_borrador WHERE borrador_id = ?',
            [req.params.id]
        );

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

        // Desactivar borrador
        await connection.query(
            'UPDATE borrador_pedido SET estado = "CONVERTIDO" WHERE borrador_id = ?',
            [req.params.id]
        );

        await connection.commit();
        res.json({
            message: 'Borrador convertido a pedido exitosamente',
            pedido_id: pedidoId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al convertir borrador',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;