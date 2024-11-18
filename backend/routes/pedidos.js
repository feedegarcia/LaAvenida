const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

        const { id } = req.params;
        const { estado, detalles, motivo } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');
        const usuario = decodedToken.nombre;

        // Validar estado
        const estadosValidos = [
            'BORRADOR',
            'EN_FABRICA',
            'PREPARADO_MODIFICADO',
            'RECIBIDO_CON_DIFERENCIAS',
            'RECIBIDO',
            'CANCELADO'
        ];

        if (!estadosValidos.includes(estado)) {
            throw new Error('Estado inválido');
        }

        // Si es cancelación, requerir motivo
        if (estado === 'CANCELADO' && !motivo) {
            throw new Error('Se requiere un motivo para cancelar el pedido');
        }

        if (estado === 'CANCELADO') {
            await connection.query(
                `UPDATE pedido 
                 SET estado = ?,
                     motivo_cancelacion = ?,
                     cancelado_por = ?,
                     fecha_cancelacion = NOW()
                 WHERE pedido_id = ?`,
                [estado, motivo, usuario, id]
            );
        } else {
            await connection.query(
                'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                [estado, id]
            );
        }

        if (detalles) {
            for (const detalle of detalles) {
                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_confirmada = ?,
                         estado = ?
                     WHERE detalle_id = ?`,
                    [detalle.cantidad_confirmada, estado, detalle.detalle_id]
                );
            }
        }

        // Si el estado es RECIBIDO, actualizar stock
        if (estado === 'RECIBIDO') {
            const [detallesPedido] = await connection.query(
                `SELECT producto_id, cantidad_confirmada
                 FROM detalle_pedido
                 WHERE pedido_id = ?`,
                [id]
            );

            const [pedido] = await connection.query(
                'SELECT sucursal_destino FROM pedido WHERE pedido_id = ?',
                [id]
            );

            for (const detalle of detallesPedido) {
                await connection.query(
                    `UPDATE stock 
                     SET cantidad = cantidad + ?,
                         fecha_actualizacion = NOW()
                     WHERE sucursal_id = ? AND producto_id = ?`,
                    [
                        detalle.cantidad_confirmada,
                        pedido[0].sucursal_destino,
                        detalle.producto_id
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al actualizar estado',
            error: error.message
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