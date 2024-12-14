
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
<<<<<<< Updated upstream
=======
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
>>>>>>> Stashed changes

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                message: 'No tiene permisos para realizar esta accion'
            });
        }
        next();
    };
};

// Rutas de pedidos
router.get('/pedido', async (req, res) => {
    try {

        const [rows] = await pool.query(`
    SELECT DISTINCT
        p.producto_id,
        p.nombre,
        p.codigo,
        p.precio_mayorista,
        p.es_sin_tac,
        p.requiere_refrigeracion,
        p.unidades_por_paquete,
        op.tipo as tipo_origen,
        op.sucursal_fabricante_id,
        op.lugar_pedido_defecto,
        COALESCE(op.sucursal_fabricante_id, op.lugar_pedido_defecto) as sucursal_pedido,
        s.nombre as sucursal_nombre,
        s.tipo as sucursal_tipo,
        cp.categoria_id,
        cp.nombre as categoria_nombre,
        sp.subcategoria_id,
        sp.nombre as subcategoria_nombre,
        COALESCE(stk.cantidad, 0) as stock
    FROM PRODUCTO p
    JOIN origen_producto op ON p.origen_id = op.origen_id
    LEFT JOIN sucursal s ON COALESCE(op.sucursal_fabricante_id, op.lugar_pedido_defecto) = s.sucursal_id
    LEFT JOIN STOCK stk ON p.producto_id = stk.producto_id
    JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
    JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
    WHERE p.activo = TRUE
    AND (
        (op.tipo = 'ELABORACION_PROPIA' AND s.tipo = 'FABRICA_VENTA')
        OR op.tipo = 'TERCEROS'
        OR p.es_sin_tac = 1
    )
`);

<<<<<<< Updated upstream
        
=======
        const query = `
            SELECT DISTINCT
                p.*, 
                op.tipo as tipo_origen,
                op.sucursal_fabricante_id,
                op.lugar_pedido_defecto,
                s.nombre as sucursal_nombre,
                s.tipo as sucursal_tipo,
                cp.nombre as categoria_nombre,
                sp.nombre as subcategoria_nombre,
                COALESCE(stk.cantidad, 0) as stock,
                COALESCE(op.sucursal_fabricante_id, op.lugar_pedido_defecto) as sucursal_pedido,
                (
                    SELECT MAX(dp.cantidad_solicitada)
                    FROM detalle_pedido dp
                    JOIN pedido ped ON dp.pedido_id = ped.pedido_id
                    WHERE dp.producto_id = p.producto_id
                    AND ped.sucursal_origen = ?
                    ORDER BY ped.fecha_pedido DESC
                    LIMIT 1
                ) as ultimo_pedido
            FROM PRODUCTO p
            JOIN origen_producto op ON p.origen_id = op.origen_id
            LEFT JOIN sucursal s ON op.sucursal_fabricante_id = s.sucursal_id
            LEFT JOIN STOCK stk ON p.producto_id = stk.producto_id
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE p.activo = TRUE
            AND (
                op.sucursal_fabricante_id != ? 
                OR op.tipo = 'TERCEROS'
                OR p.es_sin_tac = 1
            )
            ORDER BY cp.nombre, sp.nombre, p.nombre
        `;

        const [rows] = await pool.query(query, [sucursalSeleccionada, sucursalSeleccionada]);
>>>>>>> Stashed changes

        const agrupados = {
            fabricas: {},
            sinTac: [],
            varios: []
        };

        if (!rows || rows.length === 0) {
            return res.json(agrupados);
        }

        rows.forEach(producto => {


            if (producto.es_sin_tac) {
                if (!agrupados.sinTac.find(p => p.producto_id === producto.producto_id)) {
                    agrupados.sinTac.push(producto);
                }
            } else if (producto.tipo_origen === 'ELABORACION_PROPIA') {
                const sucursalId = producto.sucursal_pedido;
                if (!agrupados.fabricas[sucursalId]) {
                    agrupados.fabricas[sucursalId] = {
                        nombre: producto.sucursal_nombre,
                        subcategorias: {}
                    };
                }

                if (!agrupados.fabricas[sucursalId].subcategorias[producto.subcategoria_id]) {
                    agrupados.fabricas[sucursalId].subcategorias[producto.subcategoria_id] = {
                        nombre: producto.subcategoria_nombre,
                        productos: []
                    };
                }

                // Verificar si el producto ya existe antes de agregarlo
                const productoExistente = agrupados.fabricas[sucursalId].subcategorias[producto.subcategoria_id].productos
                    .find(p => p.producto_id === producto.producto_id);

                if (!productoExistente) {
                    agrupados.fabricas[sucursalId].subcategorias[producto.subcategoria_id].productos.push(producto);
                }
            } else if (!agrupados.varios.find(p => p.producto_id === producto.producto_id)) {
                agrupados.varios.push(producto);
            }
        });

        return res.json(agrupados);

    } catch (error) {
        console.error('Error en /pedido:', error);
        return res.status(500).json({
            message: error.message,
            stack: error.stack
        });
    }
});
<<<<<<< Updated upstream

module.exports = router;
=======
// Rutas de gestion de productos
router.get('/pedido/:pedidoId/disponibles', async (req, res) => {
    try {
        const [pedido] = await pool.query(
            'SELECT sucursal_destino FROM pedido WHERE pedido_id = ?',
            [req.params.pedidoId]
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
                COALESCE(stk.cantidad, 0) as stock,
                cp.nombre as categoria_nombre,
                sp.nombre as subcategoria_nombre
            FROM PRODUCTO p
            JOIN origen_producto op ON p.origen_id = op.origen_id
            LEFT JOIN STOCK stk ON p.producto_id = stk.producto_id
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE p.activo = TRUE 
            AND op.sucursal_fabricante_id = ?
            AND p.producto_id NOT IN (
                SELECT dp.producto_id 
                FROM detalle_pedido dp 
                WHERE dp.pedido_id = ?
            )
            ORDER BY cp.nombre, sp.nombre, p.nombre
        `, [pedido[0].sucursal_destino, req.params.pedidoId]);

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos disponibles:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin', authenticateToken, checkRole(['DUEÑO', 'ADMIN', 'EMPLEADO']), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.*, 
                cp.nombre as categoria_nombre,
                sp.nombre as subcategoria_nombre,
                cp.categoria_id,
                op.tipo as tipo_origen,
                op.sucursal_fabricante_id,
                p.activo = 1 as activo,
                p.visible_web = 1 as visible_web,
                p.es_sin_tac = 1 as es_sin_tac,
                p.requiere_refrigeracion = 1 as requiere_refrigeracion
            FROM producto p
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            JOIN origen_producto op ON p.origen_id = op.origen_id
            ORDER BY cp.nombre, sp.nombre, p.nombre
        `);

        // Convertir explícitamente los valores a booleanos
        const productos = rows.map(p => ({
            ...p,
            activo: Boolean(p.activo),
            visible_web: Boolean(p.visible_web),
            es_sin_tac: Boolean(p.es_sin_tac),
            requiere_refrigeracion: Boolean(p.requiere_refrigeracion)
        }));

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Primero crear el origen
        const [origenResult] = await connection.query(
            `INSERT INTO origen_producto (
                tipo, sucursal_fabricante_id, lugar_pedido_defecto
            ) VALUES (?, ?, ?)`,
            [
                req.body.tipo_origen,
                req.body.sucursal_fabricante_id,
                req.body.sucursal_fabricante_id // Por defecto mismo valor
            ]
        );

        // Luego crear el producto con el origen_id
        const [result] = await connection.query(
            `INSERT INTO producto (
                codigo, nombre, subcategoria_id, precio_venta, 
                precio_mayorista, precio_jueves, costo_actual,
                es_sin_tac, requiere_refrigeracion, visible_web,
                origen_id, unidad_medida_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.body.codigo,
                req.body.nombre,
                req.body.subcategoria_id,
                req.body.precio_venta,
                req.body.precio_mayorista,
                req.body.precio_jueves || null,
                req.body.costo_actual,
                req.body.es_sin_tac,
                req.body.requiere_refrigeracion,
                req.body.visible_web,
                origenResult.insertId,
                req.body.unidad_medida_id
            ]
        );

        await connection.commit();
        res.status(201).json({ message: 'Producto creado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.put('/:id', authenticateToken, checkRole(['DUEÑO', 'ADMIN', 'EMPLEADO']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const userRole = req.user.rol;

        if (userRole === 'EMPLEADO') {
            const { precio_venta } = req.body;
            await connection.query(
                'UPDATE producto SET precio_venta = ? WHERE producto_id = ?',
                [precio_venta, id]
            );
        } else {
            const {
                codigo,
                nombre,
                subcategoria_id,
                precio_venta,
                precio_mayorista,
                precio_jueves,
                costo_actual,
                es_sin_tac,
                requiere_refrigeracion,
                visible_web,
                tipo_origen,
                sucursal_fabricante_id
            } = req.body;

            // Primero actualizar origen_producto si cambio
            if (tipo_origen && sucursal_fabricante_id) {
                await connection.query(
                    `UPDATE origen_producto op
                     JOIN producto p ON p.origen_id = op.origen_id
                     SET op.tipo = ?, op.sucursal_fabricante_id = ?
                     WHERE p.producto_id = ?`,
                    [tipo_origen, sucursal_fabricante_id, id]
                );
            }

            // Luego actualizar producto
            await connection.query(
                `UPDATE producto SET 
                    codigo = ?, nombre = ?, subcategoria_id = ?,
                    precio_venta = ?, precio_mayorista = ?, precio_jueves = ?,
                    costo_actual = ?, es_sin_tac = ?, requiere_refrigeracion = ?,
                    visible_web = ?
                WHERE producto_id = ?`,
                [
                    codigo, nombre, subcategoria_id,
                    precio_venta, precio_mayorista, precio_jueves || null,
                    costo_actual, es_sin_tac, requiere_refrigeracion,
                    visible_web, id
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.patch('/subcategoria/:id/precios', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { precio_venta, precio_mayorista, precio_jueves } = req.body;

        let updateFields = [];
        let values = [];

        if (precio_venta !== null && precio_venta !== undefined) {
            updateFields.push('precio_venta = ?');
            values.push(precio_venta);
        }
        if (precio_mayorista !== null && precio_mayorista !== undefined) {
            updateFields.push('precio_mayorista = ?');
            values.push(precio_mayorista);
        }
        if (precio_jueves !== null && precio_jueves !== undefined) {
            updateFields.push('precio_jueves = ?');
            values.push(precio_jueves);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron precios para actualizar' });
        }

        values.push(id);
        const query = `
            UPDATE producto 
            SET ${updateFields.join(', ')}
            WHERE subcategoria_id = ?
        `;

        await connection.query(query, values);

        // Calcular porcentaje de cambio (ejemplo para precio_jueves)
        let porcentajeCambio = null;
        if (precio_jueves) {
            const [productos] = await connection.query(
                'SELECT precio_venta FROM producto WHERE subcategoria_id = ? LIMIT 1',
                [id]
            );
            if (productos.length > 0) {
                porcentajeCambio = ((precio_jueves - productos[0].precio_venta) / productos[0].precio_venta) * 100;
            }
        }

        // Log del cambio usando el tipo correcto
        await connection.query(
            `INSERT INTO log_cambios_precios (
                fecha_cambio, 
                usuario, 
                tipo_cambio, 
                categoria_id,
                porcentaje_cambio,
                productos_afectados
            ) VALUES (NOW(), ?, 'GRUPAL',
                (SELECT categoria_id FROM subcategoria_producto WHERE subcategoria_id = ?),
                ?,
                (SELECT COUNT(*) FROM producto WHERE subcategoria_id = ?)
            )`,
            [req.user?.nombre || 'Sistema', id, porcentajeCambio, id]
        );

        await connection.commit();
        res.json({ message: 'Precios actualizados exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error detallado:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.patch('/:id/estado', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        await pool.query(
            'UPDATE producto SET activo = ? WHERE producto_id = ?',
            [activo, id]
        );

        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/visibilidad', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { visible_web } = req.body;

        await pool.query(
            'UPDATE producto SET visible_web = ? WHERE producto_id = ?',
            [visible_web, id]
        );

        res.json({ message: 'Visibilidad actualizada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/subcategoria/:id/visibilidad', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { visible_web } = req.body;

        await connection.query(
            'UPDATE producto SET visible_web = ? WHERE subcategoria_id = ?',
            [visible_web, id]
        );

        await connection.commit();
        res.json({ message: 'Visibilidad actualizada' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.get('/categorias', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT cp.* FROM categoria_producto cp');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorias:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/categorias', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { nombre } = req.body;

        const [result] = await connection.query(
            'INSERT INTO categoria_producto (nombre) VALUES (?)',
            [nombre]
        );

        await connection.commit();
        res.status(201).json({
            message: 'Categoria creada exitosamente',
            categoria_id: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.put('/categorias/:id', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { nombre } = req.body;

        await connection.query(
            'UPDATE categoria_producto SET nombre = ? WHERE categoria_id = ?',
            [nombre, id]
        );

        await connection.commit();
        res.json({ message: 'Categoria actualizada exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.put('/subcategorias/:id', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { nombre } = req.body;

        await connection.query(
            'UPDATE subcategoria_producto SET nombre = ? WHERE subcategoria_id = ?',
            [nombre, id]
        );

        await connection.commit();
        res.json({ message: 'Subcategoria actualizada exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.get('/unidades-medida', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM unidad_medida');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener unidades de medida:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/subcategorias', authenticateToken, checkRole(['DUEÑO', 'ADMIN']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { categoria_id, nombre } = req.body;

        const [result] = await connection.query(
            'INSERT INTO subcategoria_producto (categoria_id, nombre) VALUES (?, ?)',
            [categoria_id, nombre]
        );

        await connection.commit();
        res.status(201).json({
            message: 'Subcategoria creada exitosamente',
            subcategoria_id: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }

});
router.get('/subcategorias/:categoriaId', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM subcategoria_producto WHERE categoria_id = ?',
            [req.params.categoriaId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener subcategorias:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
>>>>>>> Stashed changes
