const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const getPedidos = async (req, res) => {
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
        console.error('Error en getPedidos:', error);
        res.status(500).json({
            message: 'Error al obtener pedidos',
            error: error.message
        });
    }
};

const getPedidoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

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

        // Obtener detalles del pedido
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
};

const createPedido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            sucursal_origen,
            sucursal_destino,
            fecha_entrega_requerida,
            tipo = 'PEDIDO_FABRICA',
            detalles,
            notas,
            estado = 'EN_FABRICA' // Permitir estado como parametro
        } = req.body;

        // Validar que el usuario tiene acceso a la sucursal
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        // Verificar que el usuario tiene acceso a la sucursal origen
        const [userSucursal] = await connection.query(`
            SELECT 1 FROM usuario_sucursal 
            WHERE usuario_id = ? AND sucursal_id = ? AND activo = 1`,
            [decodedToken.id, sucursal_origen]
        );

        if (!userSucursal.length) {
            throw new Error('No tiene permisos para esta sucursal');
        }

        const [result] = await connection.query(
            `INSERT INTO pedido (
                sucursal_origen,
                sucursal_destino,
                fecha_pedido,
                fecha_entrega_requerida,
                tipo,
                estado,
                notas
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [sucursal_origen, sucursal_destino, fecha_entrega_requerida, tipo, estado, notas]
        );

        const pedidoId = result.insertId;

        if (detalles && detalles.length > 0) {
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
};

const updatePedidoEstado = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { estado, detalles, notas } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        const [pedidoActual] = await connection.query(
            'SELECT estado FROM pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        if (!pedidoActual.length) {
            throw new Error('Pedido no encontrado');
        }

        if (detalles?.length > 0) {
            const [historial] = await connection.query(
                `INSERT INTO historial_pedido (
                    pedido_id, estado_anterior, estado_nuevo, 
                    usuario_id, notas, fecha
                ) VALUES (?, ?, ?, ?, ?, NOW())`,
                [req.params.id, pedidoActual[0].estado, estado, decodedToken.id, notas]
            );

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

        await connection.query(
            'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
            [estado, req.params.id]
        );

        await connection.commit();
        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error en actualizacion de estado:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

const getPedidoHistorial = async (req, res) => {
    try {
        const [historial] = await pool.query(`
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

        for (const entrada of historial) {
            const [cambios] = await pool.query(`
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
    }
};

const agregarProductosAPedido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_id } = req.params;
        const { productos, sucursal_id } = req.body;

        // Verificar que el pedido existe y esta en estado modificable
        const [pedido] = await connection.query(
            'SELECT * FROM pedido WHERE pedido_id = ?',
            [pedido_id]
        );

        if (!pedido.length) {
            throw new Error('Pedido no encontrado');
        }

        const estadosModificables = ['EN_FABRICA', 'PREPARADO'];
        if (!estadosModificables.includes(pedido[0].estado)) {
            throw new Error('El pedido no esta en un estado que permita modificaciones');
        }

        // Verificar que los productos son de la fabrica correcta
        for (const producto of productos) {
            const [productoInfo] = await connection.query(
                `SELECT sucursal_fabricante_id FROM producto p
                 JOIN origen_producto op ON p.origen_id = op.origen_id
                 WHERE p.producto_id = ?`,
                [producto.producto_id]
            );

            if (!productoInfo.length || productoInfo[0].sucursal_fabricante_id !== pedido[0].sucursal_destino) {
                throw new Error('Uno o mas productos no pertenecen a la fabrica correcta');
            }
        }

        // Insertar nuevos detalles
        for (const producto of productos) {
            await connection.query(
                `INSERT INTO detalle_pedido (
                    pedido_id, producto_id, cantidad_solicitada,
                    precio_unitario, estado, modificado,
                    modificado_por_sucursal, fecha_modificacion
                ) VALUES (?, ?, ?, ?, 'MODIFICADO', true, ?, NOW())`,
                [
                    pedido_id,
                    producto.producto_id,
                    producto.cantidad,
                    producto.precio_unitario,
                    sucursal_id
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Productos agregados exitosamente' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getPedidos,
    getPedidoById,
    createPedido,
    updatePedidoEstado,
    getPedidoHistorial,
    agregarProductosAPedido
};