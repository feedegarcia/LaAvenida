const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Crear nuevo pedido
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('Creando nuevo pedido:', req.body);
        await connection.beginTransaction();

        const {
            sucursal_origen,
            sucursal_destino,
            fecha_entrega_requerida,
            tipo = 'PEDIDO_FABRICA',
            detalles,
            notas
        } = req.body;

        // Insertar pedido
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

        // Insertar detalles
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

        // Actualizar total del pedido
        await connection.query(
            `UPDATE pedido 
             SET total = (
                 SELECT SUM(cantidad_solicitada * precio_unitario)
                 FROM detalle_pedido 
                 WHERE pedido_id = ?
             )
             WHERE pedido_id = ?`,
            [pedidoId, pedidoId]
        );

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
// Modificar cantidades del pedido
router.patch('/:id/cantidades', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { detalles, notas } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        // Registrar modificación
        const [result] = await connection.query(
            `INSERT INTO modificacion_pedido (
                pedido_id, usuario_id, notas, fecha
            ) VALUES (?, ?, ?, NOW())`,
            [id, decodedToken.id, notas]
        );

        const modificacionId = result.insertId;

        // Actualizar cantidades
        for (const detalle of detalles) {
            await connection.query(
                `UPDATE detalle_pedido 
                 SET cantidad_confirmada = ?,
                     modificado = TRUE
                 WHERE detalle_id = ?`,
                [detalle.cantidad_nueva, detalle.detalle_id]
            );

            // Registrar cambio
            await connection.query(
                `INSERT INTO detalle_modificacion (
                    modificacion_id, detalle_id, 
                    cantidad_anterior, cantidad_nueva
                ) VALUES (?, ?, ?, ?)`,
                [modificacionId, detalle.detalle_id,
                    detalle.cantidad_anterior, detalle.cantidad_nueva]
            );
        }

        // Actualizar total del pedido
        await connection.query(
            `UPDATE pedido 
             SET total = (
                 SELECT SUM(COALESCE(cantidad_confirmada, cantidad_solicitada) * precio_unitario)
                 FROM detalle_pedido 
                 WHERE pedido_id = ?
             )
             WHERE pedido_id = ?`,
            [id, id]
        );

        await connection.commit();
        res.json({ message: 'Cantidades actualizadas exitosamente' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }


});
// Obtener historial de cambios de estado
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

// Obtener notas de un pedido
router.get('/:id/notas', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [notas] = await connection.query(
            `SELECT n.nota_id, n.texto, n.fecha_creacion,
                    s.nombre as sucursal_nombre,
                    u.nombre as usuario_nombre
             FROM notas_pedido n
             JOIN usuario u ON n.usuario_id = u.usuario_id
             JOIN sucursal s ON n.sucursal_id = s.sucursal_id
             WHERE n.pedido_id = ?
             ORDER BY n.fecha_creacion DESC`,
            [req.params.id]
        );
        res.json(notas);
    } catch (error) {
        console.error('Error al obtener notas:', error);
        res.status(500).json({
            message: 'Error al obtener notas',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Agregar nota a un pedido
router.post('/:id/notas', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;
        const { texto } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        // Obtener información de la sucursal del usuario
        const [userSucursales] = await connection.query(
            `SELECT s.* 
             FROM usuario_sucursal us 
             JOIN sucursal s ON us.sucursal_id = s.sucursal_id 
             WHERE us.usuario_id = ? AND us.activo = 1
             LIMIT 1`,
            [decodedToken.id]
        );

        if (!userSucursales.length) {
            throw new Error('Usuario no tiene sucursal asignada');
        }

        const sucursal = userSucursales[0];

        // Insertar la nota
        await connection.query(
            `INSERT INTO notas_pedido 
             (pedido_id, usuario_id, sucursal_id, texto, fecha_creacion) 
             VALUES (?, ?, ?, ?, NOW())`,
            [id, decodedToken.id, sucursal.sucursal_id, texto]
        );

        await connection.commit();

        // Devolver la nota con la información completa
        const [notaInsertada] = await connection.query(
            `SELECT n.*, u.nombre as usuario_nombre, s.nombre as sucursal_nombre
             FROM notas_pedido n
             JOIN usuario u ON n.usuario_id = u.usuario_id
             JOIN sucursal s ON n.sucursal_id = s.sucursal_id
             WHERE n.nota_id = LAST_INSERT_ID()`
        );

        res.json({
            message: 'Nota agregada exitosamente',
            nota: notaInsertada[0]
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en agregar nota:', error);
        res.status(500).json({
            message: 'Error al agregar nota',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Obtener todos los pedidos con información completa
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
// Solicitudes y estados de pedidos
router.post('/:id/solicitud-modificacion', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { solicitud } = req.body;
        const pedidoId = req.params.id;

        // Insertar solicitud
        const [result] = await connection.query(
            `INSERT INTO solicitud_modificacion_pedido 
             (pedido_id, solicitado_por, estado, notas) 
             VALUES (?, ?, 'PENDIENTE', ?)`,
            [pedidoId, solicitud.solicitado_por, solicitud.notas]
        );

        const solicitudId = result.insertId;

        // Insertar detalles
        for (const cambio of solicitud.cambios) {
            await connection.query(
                `INSERT INTO detalle_solicitud_modificacion 
                 (solicitud_id, detalle_pedido_id, cantidad_anterior, cantidad_nueva) 
                 VALUES (?, ?, ?, ?)`,
                [solicitudId, cambio.detalle_id, cambio.cantidad_anterior, cambio.cantidad_nueva]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            solicitud_id: solicitudId
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Obtener detalle de un pedido específico
router.get('/:id', async (req, res) => {
    try {
        const [pedido] = await pool.query(`
            SELECT 
                p.*,
                so.nombre as sucursal_origen_nombre,
                sd.nombre as sucursal_destino_nombre
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
                sp.subcategoria_id
            FROM detalle_pedido dp
            JOIN producto pr ON dp.producto_id = pr.producto_id
            JOIN subcategoria_producto sp ON pr.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE dp.pedido_id = ?
            ORDER BY cp.nombre, sp.nombre, pr.nombre
        `, [req.params.id]);

        res.json({
            ...pedido[0],
            detalles
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener detalle del pedido',
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

        // Insertar en historial
        const [historial] = await connection.query(
            `INSERT INTO historial_pedido (
                pedido_id, estado_anterior, estado_nuevo, 
                usuario_id, notas, fecha
            ) VALUES (?, 
                (SELECT estado FROM pedido WHERE pedido_id = ?),
                ?, ?, ?, NOW()
            )`,
            [req.params.id, req.params.id, estado, decodedToken.id, notas]
        );

        // Actualizar estado del pedido principal
        await connection.query(
            'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
            [estado, req.params.id]
        );

        // Si hay detalles modificados
        if (detalles && detalles.length > 0) {
            for (const detalle of detalles) {
                // Registrar cambios en detalles
                await connection.query(
                    `INSERT INTO detalle_cambio (
                        historial_id, detalle_id, 
                        cantidad_anterior, cantidad_nueva
                    ) VALUES (?, ?, ?, ?)`,
                    [
                        historial.insertId,
                        detalle.detalle_id,
                        detalle.cantidad_anterior,
                        detalle.cantidad_nueva
                    ]
                );

                // Actualizar cantidades sin modificar el estado del detalle
                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_confirmada = ?,
                         modificado = TRUE
                     WHERE detalle_id = ?`,
                    [detalle.cantidad_nueva, detalle.detalle_id]
                );
            }
        }

        await connection.commit();
        res.json({
            message: 'Estado actualizado exitosamente',
            estado: estado
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error en actualización de estado:', error);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    } finally {
        connection.release();
    }
});

// Rutas de borradores
router.post('/borrador', async (req, res) => {
    try {
        const { sucursal_id, usuario_id, fecha_entrega_requerida, detalles, notas } = req.body;

        // Validaciones
        if (!sucursal_id || !usuario_id || !fecha_entrega_requerida || !detalles) {
            return res.status(400).json({
                message: 'Faltan datos requeridos',
                received: {
                    sucursal_id,
                    usuario_id,
                    fecha_entrega_requerida,
                    detallesCount: detalles?.length
                }
            });
        }

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

// Exportar el router al final
module.exports = router;