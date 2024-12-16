const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const getPedidos = async (req, res) => {
    try {
        // Obtener las sucursales del usuario del token
        const usuarioId = req.user.id;

        // Primero obtener las sucursales del usuario
        const [userSucursales] = await pool.query(`
            SELECT sucursal_id 
            FROM usuario_sucursal 
            WHERE usuario_id = ? AND activo = 1
        `, [usuarioId]);

        const sucursalIds = userSucursales.map(s => s.sucursal_id);

        if (sucursalIds.length === 0) {
            return res.json([]);
        }

        // Consulta modificada para filtrar por sucursales del usuario
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
            WHERE p.sucursal_origen IN (?) OR p.sucursal_destino IN (?)
            ORDER BY p.fecha_pedido DESC
        `, [sucursalIds, sucursalIds]);

        res.json(pedidos);
    } catch (error) {
        console.error('Error en getPedidos:', error);
        res.status(500).json({
            message: 'Error al obtener pedidos',
            error: error.message
        });
    }
};

const getProductosDisponibles = async (req, res) => {
    try {
        const [pedido] = await pool.query(
            'SELECT sucursal_destino FROM pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        if (!pedido.length) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const [productos] = await pool.query(`
            SELECT DISTINCT
                p.producto_id,
                p.nombre,
                p.codigo,
                p.precio_mayorista,
                op.tipo as tipo_origen,
                cp.nombre as categoria_nombre,
                sp.nombre as subcategoria_nombre
            FROM PRODUCTO p
            JOIN origen_producto op ON p.origen_id = op.origen_id
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE p.activo = TRUE 
            AND op.sucursal_fabricante_id = ?
            AND p.producto_id NOT IN (
                SELECT dp.producto_id 
                FROM detalle_pedido dp 
                WHERE dp.pedido_id = ?
            )
            GROUP BY 
                p.producto_id, 
                p.nombre, 
                p.codigo, 
                p.precio_mayorista, 
                op.tipo,
                cp.nombre, 
                sp.nombre
            ORDER BY cp.nombre, sp.nombre, p.nombre
        `, [pedido[0].sucursal_destino, req.params.id]);

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: error.message });
    }
};

const eliminarProductoDePedido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id: pedidoId, detalleId } = req.params;
        const sucursalId = req.user.sucursal_id;

        // Obtener información del pedido
        const [[pedido]] = await connection.query(
            'SELECT estado, sucursal_origen, sucursal_destino FROM pedido WHERE pedido_id = ?',
            [pedidoId]
        );

        if (!pedido) {
            throw new Error('Pedido no encontrado');
        }

        if (pedido.estado === 'FINALIZADO') {
            throw new Error('No se pueden eliminar productos de un pedido finalizado');
        }

        let nuevoEstado = pedido.estado;

        // Si es sucursal destino (fábrica) y está en PREPARADO
        if (sucursalId === pedido.sucursal_destino && pedido.estado === 'PREPARADO') {
            nuevoEstado = 'PREPARADO_MODIFICADO';
        }
        // Si es sucursal origen y está en EN_FABRICA
        else if (sucursalId === pedido.sucursal_origen && pedido.estado === 'EN_FABRICA') {
            nuevoEstado = 'EN_FABRICA_MODIFICADO';
        }

        // Actualizar detalle_pedido
        await connection.query(
            `UPDATE detalle_pedido 
             SET cantidad_solicitada = 0,
                 modificado = 1,
                 modificado_por_sucursal = ?,
                 fecha_modificacion = CURRENT_TIMESTAMP
             WHERE pedido_id = ? AND detalle_id = ?`,
            [sucursalId, pedidoId, detalleId]
        );

        // Si hubo cambio de estado, actualizarlo
        if (nuevoEstado !== pedido.estado) {
            await connection.query(
                'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                [nuevoEstado, pedidoId]
            );

            // Registrar en historial
            await connection.query(`
                INSERT INTO historial_pedido 
                (pedido_id, estado_anterior, estado_nuevo, usuario_id, fecha)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [pedidoId, pedido.estado, nuevoEstado, req.user.id]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Producto eliminado exitosamente',
            nuevoEstado,
            cambioEstado: nuevoEstado !== pedido.estado
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar producto:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
};

const getPedidoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener pedido y detalles b sicos
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
                COALESCE(dp.recibido, 0) as recibido,
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

        // Obtener detalles completos del pedido
        const [detalles] = await connection.query(`
        SELECT 
            dp.detalle_id,
            dp.pedido_id,
            dp.producto_id,
            dp.cantidad_solicitada,
            dp.cantidad_confirmada,
            dp.precio_unitario,
            dp.modificado,
            dp.modificado_por_sucursal,
            CAST(dp.recibido AS UNSIGNED) as recibido,  -- Forzar el tipo
            p.nombre as producto_nombre,
            p.codigo as producto_codigo,
            cp.nombre as categoria_nombre,
            sp.nombre as subcategoria_nombre
        FROM detalle_pedido dp
        JOIN producto p ON dp.producto_id = p.producto_id
        JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
        JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
        WHERE dp.pedido_id = ?
        ORDER BY cp.nombre, sp.nombre, p.nombre
    `, [req.params.id]);

        console.log('Detalles cargados:', detalles.map(d => ({
            detalle_id: d.detalle_id,
            recibido: d.recibido
        })));

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
            estado = 'EN_FABRICA'
        } = req.body;

        // Verificar que el usuario tiene acceso a la sucursal
        const [userSucursal] = await connection.query(`
            SELECT 1 FROM usuario_sucursal 
            WHERE usuario_id = ? AND sucursal_id = ? AND activo = 1`,
            [req.user.id, sucursal_origen]
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
                // Insertar en detalle_pedido
                await connection.query(
                    `INSERT INTO detalle_pedido (
                        pedido_id,
                        producto_id,
                        cantidad_solicitada,
                        precio_unitario,
                        estado
                    ) VALUES (?, ?, ?, ?, 'PENDIENTE')`,
                    [pedidoId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
                );

                // Guardar cantidad original
                await connection.query(
                    `INSERT INTO detalle_pedido_original (
                        pedido_id,
                        producto_id,
                        cantidad_original
                    ) VALUES (?, ?, ?)`,
                    [pedidoId, detalle.producto_id, detalle.cantidad]
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

        const { estado, sucursalId } = req.body; 
        const { id: pedidoId } = req.params;
        const usuarioId = req.user.id;

        console.log('Datos recibidos:', {
            estado,
            pedidoId,
            usuarioId,
            sucursalRecibida: sucursalId,
            body: req.body
        });

        // Obtener estado actual del pedido
        const [pedidoActual] = await connection.query(
            'SELECT estado, sucursal_origen, sucursal_destino FROM pedido WHERE pedido_id = ?',
            [pedidoId]
        );

        if (!pedidoActual.length) {
            throw new Error('Pedido no encontrado');
        }

        const transicionValida = esTransicionValida(
            pedidoActual[0].estado,
            estado,
            sucursalId,
            pedidoActual[0]
        );

        console.log('Validación de transición:', {
            esValida: transicionValida,
            estadoActual: pedidoActual[0].estado,
            nuevoEstado: estado
        });

        if (!transicionValida) {
            throw new Error(`Transición de estado no permitida para sucursal ${sucursalId}`);
        }

        // Actualizar estado del pedido
        await connection.query(
            'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
            [estado, pedidoId]
        );

        // Registrar en historial
        await connection.query(`
            INSERT INTO historial_pedido 
            (pedido_id, estado_anterior, estado_nuevo, usuario_id, fecha)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [pedidoId, pedidoActual[0].estado, estado, usuarioId]
        );

        await connection.commit();
        res.json({
            success: true,
            message: 'Estado actualizado exitosamente',
            nuevoEstado: estado
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error detallado en actualización:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    } finally {
        connection.release();
    }
};

async function verificarModificaciones(pedidoId, sucursalId) {
    const [[pedido]] = await pool.query(
        'SELECT sucursal_origen, sucursal_destino FROM pedido WHERE pedido_id = ?',
        [pedidoId]
    );

    const [detalles] = await pool.query(`
        SELECT 
            detalle_id,
            cantidad_solicitada,
            cantidad_confirmada,
            modificado,
            modificado_por_sucursal
        FROM detalle_pedido 
        WHERE pedido_id = ?
    `, [pedidoId]);

    // Si es sucursal destino
    if (sucursalId === pedido.sucursal_destino) {
        return detalles.some(detalle =>
            (detalle.cantidad_confirmada !== null &&
                detalle.cantidad_confirmada !== detalle.cantidad_solicitada) ||
            detalle.modificado_por_sucursal === sucursalId
        );
    }

    return false;
}

// Funciones nuevas y modificadas
const compararCambios = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { pedidoId } = req.params;
        const sucursalId = req.user.sucursal_id;

        const [[pedido]] = await connection.query(
            'SELECT sucursal_origen, sucursal_destino, estado FROM pedido WHERE pedido_id = ?',
            [pedidoId]
        );

        const [detalles] = await connection.query(`
            SELECT 
                detalle_id,
                cantidad_solicitada,
                cantidad_confirmada,
                modificado,
                modificado_por_sucursal
            FROM detalle_pedido 
            WHERE pedido_id = ?
        `, [pedidoId]);

        let hayModificaciones = false;

        // Si es sucursal destino
        if (sucursalId === pedido.sucursal_destino) {
            hayModificaciones = detalles.some(detalle => {
                // Si cantidad_confirmada es null, no hay modificaci n
                if (detalle.cantidad_confirmada === null) return false;

                // Hay modificaci n solo si la cantidad confirmada es diferente a la solicitada
                return detalle.cantidad_confirmada !== detalle.cantidad_solicitada;
            });
        }

        console.log('Resultado verificaci n detallado:', {
            pedidoId,
            sucursalId,
            hayModificaciones,
            detalles: detalles.map(d => ({
                detalle_id: d.detalle_id,
                solicitada: d.cantidad_solicitada,
                confirmada: d.cantidad_confirmada,
                tieneModificacion: d.cantidad_confirmada !== null &&
                    d.cantidad_confirmada !== d.cantidad_solicitada
            }))
        });

        res.json({ modificado: hayModificaciones });
    } catch (error) {
        console.error('Error en compararCambios:', error);
        res.status(500).json({ error: 'Error al comparar cambios' });
    } finally {
        connection.release();
    }
};

const marcarProductoRecibido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('Recibiendo petici n de marcar:', {
            params: req.params,
            body: req.body
        });

        await connection.beginTransaction();

        const { pedidoId, detalleId } = req.params;
        const { recibido } = req.body;
        const sucursalId = req.user.sucursal_id;

        // Convertir expl citamente a 1 o 0 para MySQL
        const valorRecibido = recibido ? 1 : 0;

        // Verificar que es un pedido v lido y el usuario tiene permisos
        const [[pedido]] = await connection.query(
            'SELECT estado, sucursal_origen FROM pedido WHERE pedido_id = ?',
            [pedidoId]
        );

        if (!pedido || !['PREPARADO', 'PREPARADO_MODIFICADO'].includes(pedido.estado)) {
            throw new Error('Pedido no v lido o en estado incorrecto');
        }

        console.log('Ejecutando update con:', {
            recibido: valorRecibido,
            detalleId,
            pedidoId
        });

        // Actualizar el estado de recibido
        await connection.query(
            `UPDATE detalle_pedido 
             SET recibido = ?,
                 fecha_modificacion = CURRENT_TIMESTAMP
             WHERE detalle_id = ? AND pedido_id = ?`,
            [valorRecibido, detalleId, pedidoId]
        );

        // Verificar el cambio inmediatamente despu s
        const [[actualizado]] = await connection.query(
            'SELECT detalle_id, recibido FROM detalle_pedido WHERE detalle_id = ?',
            [detalleId]
        );

        console.log('Estado despu s de actualizar:', actualizado);

        await connection.commit();
        res.json({
            success: true,
            message: 'Estado de recepci n actualizado',
            estadoActual: actualizado.recibido === 1
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al marcar producto como recibido:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

const agregarProductosAPedido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id: pedidoId } = req.params;
        const { producto_id, cantidad, precio_unitario } = req.body;
        const sucursalId = req.user.sucursal_id;

        // Obtener información del pedido
        const [[pedido]] = await connection.query(
            'SELECT estado, sucursal_origen, sucursal_destino FROM pedido WHERE pedido_id = ?',
            [pedidoId]
        );

        if (!pedido) {
            throw new Error('Pedido no encontrado');
        }

        if (pedido.estado === 'FINALIZADO') {
            throw new Error('No se pueden agregar productos a un pedido finalizado');
        }

        let result;
        let nuevoEstado = pedido.estado;

        // Si es sucursal destino (fábrica)
        if (sucursalId === pedido.sucursal_destino) {
            // Si está en estado PREPARADO, debe pasar a PREPARADO_MODIFICADO
            if (pedido.estado === 'PREPARADO') {
                nuevoEstado = 'PREPARADO_MODIFICADO';
            }

            [result] = await connection.query(
                `INSERT INTO detalle_pedido (
                    pedido_id,
                    producto_id,
                    cantidad_solicitada,
                    cantidad_confirmada,
                    precio_unitario,
                    modificado,
                    modificado_por_sucursal,
                    estado
                ) VALUES (?, ?, 0, ?, ?, TRUE, ?, 'PENDIENTE')`,
                [pedidoId, producto_id, cantidad, precio_unitario, sucursalId]
            );

        } else if (sucursalId === pedido.sucursal_origen) {
            // Si está en EN_FABRICA, debe pasar a EN_FABRICA_MODIFICADO
            if (pedido.estado === 'EN_FABRICA') {
                nuevoEstado = 'EN_FABRICA_MODIFICADO';
            }

            [result] = await connection.query(
                `INSERT INTO detalle_pedido (
                    pedido_id,
                    producto_id,
                    cantidad_solicitada,
                    precio_unitario,
                    modificado,
                    modificado_por_sucursal,
                    estado
                ) VALUES (?, ?, ?, ?, TRUE, ?, 'PENDIENTE')`,
                [pedidoId, producto_id, cantidad, precio_unitario, sucursalId]
            );
        }

        // Si hubo cambio de estado, actualizarlo
        if (nuevoEstado !== pedido.estado) {
            await connection.query(
                'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                [nuevoEstado, pedidoId]
            );

            // Registrar en historial
            await connection.query(`
                INSERT INTO historial_pedido 
                (pedido_id, estado_anterior, estado_nuevo, usuario_id, fecha)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [pedidoId, pedido.estado, nuevoEstado, req.user.id]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Producto agregado exitosamente',
            nuevoEstado,
            cambioEstado: nuevoEstado !== pedido.estado
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error en agregarProductosAPedido:', error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
};

function esTransicionValida(estadoActual, nuevoEstado, sucursalId, pedido) {
    console.log('Validando transición:', {
        estadoActual,
        nuevoEstado,
        sucursalId,
        pedido_origen: pedido.sucursal_origen,
        pedido_destino: pedido.sucursal_destino
    });

    const transicionesValidas = {
        EN_FABRICA: {
            PREPARADO: sucursalId === pedido.sucursal_destino,
            PREPARADO_MODIFICADO: sucursalId === pedido.sucursal_destino,
            EN_FABRICA_MODIFICADO: sucursalId === pedido.sucursal_origen
        },
        EN_FABRICA_MODIFICADO: {
            PREPARADO: sucursalId === pedido.sucursal_destino,
            PREPARADO_MODIFICADO: sucursalId === pedido.sucursal_destino
        },
        PREPARADO: {
            FINALIZADO: sucursalId === pedido.sucursal_origen,  // Cambiado: de RECIBIDO a FINALIZADO
            RECIBIDO_CON_DIFERENCIAS: sucursalId === pedido.sucursal_origen
        },
        PREPARADO_MODIFICADO: {
            FINALIZADO: sucursalId === pedido.sucursal_origen,  // Cambiado: de RECIBIDO a FINALIZADO
            RECIBIDO_CON_DIFERENCIAS: sucursalId === pedido.sucursal_origen
        },
        RECIBIDO_CON_DIFERENCIAS: {
            FINALIZADO: sucursalId === pedido.sucursal_destino,
            EN_FABRICA_MODIFICADO: sucursalId === pedido.sucursal_destino
        },
        BORRADOR: {
            EN_FABRICA: true
        }
    };

    const esValida = transicionesValidas[estadoActual]?.[nuevoEstado] ?? false;

    console.log('Resultado validación:', {
        esValida,
        razon: !esValida ? 'Transición no permitida para esta sucursal' : 'Transición válida',
        sucursalId,
        destino: pedido.sucursal_destino,
        origen: pedido.sucursal_origen
    });

    return esValida;
}

const modificarCantidadProducto = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('1. Iniciando modificación:', {
            params: req.params,
            body: req.body,
            user: req.user
        });
        await connection.beginTransaction();
        const { pedidoId, detalleId } = req.params;
        const { cantidad } = req.body;

        // Obtener sucursalId del usuario
        const sucursalId = req.user.sucursales?.[0]?.id;
        if (!sucursalId) {
            throw new Error('Usuario sin sucursal asignada');
        }

        // Obtener información del pedido y validar
        const [[pedido]] = await connection.query(`
           SELECT p.*, dp.cantidad_solicitada, dp.cantidad_confirmada
           FROM pedido p
           JOIN detalle_pedido dp ON dp.pedido_id = p.pedido_id
           WHERE p.pedido_id = ? AND dp.detalle_id = ?
       `, [pedidoId, detalleId]);

        console.log('2. Información del pedido:', pedido);

        if (!pedido) {
            throw new Error('Pedido no encontrado');
        }

        // Validar que el pedido no esté finalizado
        if (pedido.estado === 'FINALIZADO') {
            throw new Error('No se puede modificar un pedido finalizado');
        }

        // Validar que el usuario tenga permiso para modificar según el estado
        const permisoModificacion = req.user.rol === 'ADMIN' ||
            (sucursalId === pedido.sucursal_origen && ['EN_FABRICA', 'EN_FABRICA_MODIFICADO', 'PREPARADO', 'PREPARADO_MODIFICADO'].includes(pedido.estado)) ||
            (sucursalId === pedido.sucursal_destino && ['EN_FABRICA', 'EN_FABRICA_MODIFICADO', 'PREPARADO'].includes(pedido.estado));

        if (!permisoModificacion) {
            throw new Error('No tiene permisos para modificar este pedido en su estado actual');
        }

        let nuevoEstado = pedido.estado;

        // Determinar qué campo actualizar según la sucursal
        if (sucursalId === pedido.sucursal_origen) {
            // Sucursal origen modifica cantidad_solicitada
            await connection.query(`
               UPDATE detalle_pedido 
               SET cantidad_solicitada = ?,
                   modificado = 1,
                   modificado_por_sucursal = ?,
                   fecha_modificacion = CURRENT_TIMESTAMP
               WHERE detalle_id = ? AND pedido_id = ?
           `, [cantidad, sucursalId, detalleId, pedidoId]);

            // Si está en EN_FABRICA, cambia a EN_FABRICA_MODIFICADO
            if (pedido.estado === 'EN_FABRICA') {
                nuevoEstado = 'EN_FABRICA_MODIFICADO';
            }
        } else if (sucursalId === pedido.sucursal_destino) {
            // Sucursal destino modifica cantidad_confirmada
            await connection.query(`
               UPDATE detalle_pedido 
               SET cantidad_confirmada = ?,
                   modificado = 1,
                   modificado_por_sucursal = ?,
                   fecha_modificacion = CURRENT_TIMESTAMP
               WHERE detalle_id = ? AND pedido_id = ?
           `, [cantidad, sucursalId, detalleId, pedidoId]);

            // NUEVO: Si está en PREPARADO, cambia a PREPARADO_MODIFICADO
            if (pedido.estado === 'PREPARADO') {
                nuevoEstado = 'PREPARADO_MODIFICADO';
            }
        } else {
            throw new Error('Sucursal no autorizada para modificar este pedido');
        }

        // Si hubo cambio de estado, actualizarlo
        if (nuevoEstado !== pedido.estado) {
            console.log('3. Actualizando estado:', {
                estadoAnterior: pedido.estado,
                nuevoEstado
            });

            await connection.query(
                'UPDATE pedido SET estado = ? WHERE pedido_id = ?',
                [nuevoEstado, pedidoId]
            );

            // Registrar en historial
            await connection.query(`
               INSERT INTO historial_pedido 
               (pedido_id, estado_anterior, estado_nuevo, usuario_id, fecha)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [pedidoId, pedido.estado, nuevoEstado, req.user.id]
            );
        }

        await connection.commit();
        res.json({
            message: 'Cantidad actualizada correctamente',
            nuevoEstado,
            cambioEstado: nuevoEstado !== pedido.estado
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al modificar cantidad:', error);
        res.status(500).json({
            error: 'Error al modificar cantidad',
            message: error.message
        });
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
module.exports = {
    getPedidos,
    getPedidoById,
    createPedido,
    updatePedidoEstado,
    getPedidoHistorial,
    agregarProductosAPedido,
    getProductosDisponibles,
    eliminarProductoDePedido,
    compararCambios,
    marcarProductoRecibido,
    modificarCantidadProducto 
};