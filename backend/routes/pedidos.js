const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener todos los pedidos con informaciÃ³n completa
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

// Crear nuevo pedido
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            sucursal_origen,
            sucursal_destino,
            fecha_entrega_requerida,
            tipo,
            detalles,
            notas
        } = req.body;

        // AquÃ­ estÃ¡ el cambio: 'PENDIENTE' -> 'EN_FABRICA'
        const [result] = await connection.query(
            `INSERT INTO pedido (
                sucursal_origen,
                sucursal_destino,
                fecha_pedido,
                fecha_entrega_requerida,
                estado,
                tipo,
                notas
            ) VALUES (?, ?, NOW(), ?, 'EN_FABRICA', ?, ?)`,
            [sucursal_origen, sucursal_destino, fecha_entrega_requerida, tipo, notas]
        );

        const pedido_id = result.insertId;

        // Insertar detalles
        for (const detalle of detalles) {
            await connection.query(
                `INSERT INTO detalle_pedido (
                    pedido_id,
                    producto_id,
                    cantidad_solicitada,
                    precio_unitario,
                    estado
                ) VALUES (?, ?, ?, ?, 'PENDIENTE')`,
                [pedido_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
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
            [pedido_id, pedido_id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Pedido creado exitosamente',
            pedido_id
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al crear pedido',
            error: error.message
        });
    } finally {
        connection.release();
    }
});


// Obtener historial de solicitudes de un pedido
router.get('/:id/solicitudes', async (req, res) => {
    try {
        const [solicitudes] = await pool.query(`
            SELECT 
                smp.*,
                u.nombre as solicitante,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'detalle_id', dsm.detalle_pedido_id,
                        'producto_nombre', p.nombre,
                        'cantidad_anterior', dsm.cantidad_anterior,
                        'cantidad_nueva', dsm.cantidad_nueva
                    )
                ) as cambios
            FROM solicitud_modificacion_pedido smp
            JOIN usuario u ON smp.solicitado_por = u.usuario_id
            JOIN detalle_solicitud_modificacion dsm ON smp.solicitud_id = dsm.solicitud_id
            JOIN detalle_pedido dp ON dsm.detalle_pedido_id = dp.detalle_id
            JOIN producto p ON dp.producto_id = p.producto_id
            WHERE smp.pedido_id = ?
            GROUP BY smp.solicitud_id
            ORDER BY smp.fecha_solicitud DESC
        `, [req.params.id]);

        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener solicitudes',
            error: error.message
        });
    }
});

// Aprobar/rechazar solicitud
router.patch('/:id/solicitudes/:solicitud_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { estado, notas_respuesta } = req.body;
        const { id, solicitud_id } = req.params;

        // Actualizar estado de la solicitud
        await connection.query(
            `UPDATE solicitud_modificacion_pedido 
             SET estado = ?, 
                 notas = CONCAT(COALESCE(notas, ''), '\nRespuesta: ', ?)
             WHERE solicitud_id = ? AND pedido_id = ?`,
            [estado, notas_respuesta || '', solicitud_id, id]
        );

        // Si se aprueba, actualizar cantidades del pedido
        if (estado === 'APROBADA') {
            const [cambios] = await connection.query(
                `SELECT * FROM detalle_solicitud_modificacion 
                 WHERE solicitud_id = ?`,
                [solicitud_id]
            );

            for (const cambio of cambios) {
                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_solicitada = ?,
                         cantidad_confirmada = NULL
                     WHERE detalle_id = ?`,
                    [cambio.cantidad_nueva, cambio.detalle_pedido_id]
                );
            }
        }

        await connection.commit();
        res.json({
            message: `Solicitud ${estado.toLowerCase()} exitosamente`
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            message: 'Error al procesar la solicitud',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Solicitar modificaciÃ³n de pedido
router.post('/:id/solicitud-modificacion', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { solicitado_por, cambios, notas } = req.body;

        // Insertar solicitud
        const [result] = await connection.query(
            `INSERT INTO solicitud_modificacion_pedido 
             (pedido_id, solicitado_por, estado, notas) 
             VALUES (?, ?, 'PENDIENTE', ?)`,
            [id, solicitado_por, notas]
        );

        const solicitud_id = result.insertId;

        // Insertar detalles de cambios
        for (const cambio of cambios) {
            await connection.query(
                `INSERT INTO detalle_solicitud_modificacion 
                 (solicitud_id, detalle_pedido_id, cantidad_anterior, cantidad_nueva)
                 VALUES (?, ?, ?, ?)`,
                [solicitud_id, cambio.detalle_id, cambio.cantidad_anterior, cambio.cantidad_nueva]
            );
        }

        await connection.commit();
        res.status(201).json({
            message: 'Solicitud de modificaciÃ³n creada exitosamente',
            solicitud_id
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            message: 'Error al crear solicitud de modificaciÃ³n',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Aprobar/Rechazar solicitud
router.patch('/:id/solicitud-modificacion/:solicitud_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id, solicitud_id } = req.params;
        const { estado, notas } = req.body;

        await connection.query(
            `UPDATE solicitud_modificacion_pedido 
             SET estado = ?, notas = CONCAT(COALESCE(notas, ''), '\n', ?)
             WHERE solicitud_id = ? AND pedido_id = ?`,
            [estado, notas, solicitud_id, id]
        );

        // Si se aprueba, aplicar los cambios
        if (estado === 'APROBADA') {
            const [cambios] = await connection.query(
                `SELECT * FROM detalle_solicitud_modificacion 
                 WHERE solicitud_id = ?`,
                [solicitud_id]
            );

            for (const cambio of cambios) {
                await connection.query(
                    `UPDATE detalle_pedido 
                     SET cantidad_solicitada = ?
                     WHERE detalle_id = ?`,
                    [cambio.cantidad_nueva, cambio.detalle_pedido_id]
                );
            }
        }

        await connection.commit();
        res.json({
            message: `Solicitud de modificaciÃ³n ${estado.toLowerCase()} exitosamente`
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            message: 'Error al procesar solicitud de modificaciÃ³n',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Obtener solicitudes de modificaciÃ³n de un pedido
router.get('/:id/solicitudes-modificacion', async (req, res) => {
    try {
        const [solicitudes] = await pool.query(
            `SELECT smp.*, 
                    u.nombre as solicitante,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'detalle_id', dsm.detalle_pedido_id,
                            'cantidad_anterior', dsm.cantidad_anterior,
                            'cantidad_nueva', dsm.cantidad_nueva
                        )
                    ) as cambios
             FROM solicitud_modificacion_pedido smp
             JOIN usuario u ON smp.solicitado_por = u.usuario_id
             JOIN detalle_solicitud_modificacion dsm ON smp.solicitud_id = dsm.solicitud_id
             WHERE smp.pedido_id = ?
             GROUP BY smp.solicitud_id`,
            [req.params.id]
        );

        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener solicitudes de modificaciÃ³n',
            error: error.message
        });
    }


});
// Crear borrador
router.post('/borrador', async (req, res) => {
    try {

        const { sucursal_id, usuario_id, fecha_entrega_requerida, detalles, notas } = req.body

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
            })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // Crear el borrador
            const [result] = await connection.query(
                `INSERT INTO borrador_pedido 
                (sucursal_id, usuario_id, fecha_entrega_requerida, notas, estado) 
                VALUES (?, ?, ?, ?, 'ACTIVO')`,
                [sucursal_id, usuario_id, fecha_entrega_requerida, notas]
            )

            const borrador_id = result.insertId

            // Insertar los detalles
            for (const detalle of detalles) {
                await connection.query(
                    `INSERT INTO detalle_borrador 
                    (borrador_id, producto_id, cantidad, precio_unitario) 
                    VALUES (?, ?, ?, ?)`,
                    [borrador_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
                )
            }

            await connection.commit()

            res.status(201).json({
                message: 'Borrador creado exitosamente',
                borrador_id
            })

        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }

    } catch (error) {
        console.error('Error en creaciÃ³n de borrador:', error)
        res.status(500).json({
            message: 'Error al crear el borrador',
            error: error.message
        })
    }
})

// Obtener borradores de una sucursal
router.get('/borradores/:sucursal_id', async (req, res) => {
    try {
        const [borradores] = await pool.query(
            'SELECT * FROM vw_borradores_activos WHERE sucursal_id = ?',
            [req.params.sucursal_id]
        );
        res.json(borradores);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Obtener detalle de un borrador
router.get('/borrador/:borrador_id', async (req, res) => {
    try {
        const [borrador] = await pool.query(
            `SELECT * FROM borrador_pedido WHERE borrador_id = ?`,
            [req.params.borrador_id]
        );

        const [detalles] = await pool.query(
            `SELECT 
                db.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo
            FROM detalle_borrador db
            JOIN producto p ON db.producto_id = p.producto_id
            WHERE db.borrador_id = ?`,
            [req.params.borrador_id]
        );

        res.json({
            ...borrador[0],
            detalles
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Confirmar borrador
router.patch('/borrador/:borrador_id/confirmar', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE borrador_pedido SET estado = "CONFIRMADO" WHERE borrador_id = ?',
            [req.params.borrador_id]
        );

        await connection.commit();
        res.json({ message: 'Borrador confirmado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
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
            throw new Error('Estado invÃ¡lido');
        }

        // Si es cancelaciÃ³n, requerir motivo
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

module.exports = router;
