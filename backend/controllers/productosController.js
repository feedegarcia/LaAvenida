const pool = require('../config/database');

const productosController = {
    // Obtener todos los productos
    getProductos: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT p.*, 
                       cp.nombre as categoria_nombre,
                       sp.nombre as subcategoria_nombre,
                       cp.categoria_id
                FROM producto p
                JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
                JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
                ORDER BY p.nombre
            `);

            // Obtener descuentos para cada producto
            for (let producto of rows) {
                const [descuentos] = await pool.query(
                    'SELECT * FROM producto_descuento WHERE producto_id = ? AND activo = 1',
                    [producto.producto_id]
                );
                producto.descuentos = descuentos;
            }

            res.json(rows);
        } catch (error) {
            console.error('Error al obtener productos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nuevo producto
    createProducto: async (req, res) => {
        const {
            codigo,
            nombre,
            subcategoria_id,
            precio_venta,
            precio_mayorista,
            costo_actual,
            es_sin_tac,
            requiere_refrigeracion,
            unidades_por_paquete,
            stock_minimo,
            activo,
            descuentos
        } = req.body;

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Insertar producto
            const [result] = await connection.query(
                `INSERT INTO producto (
                    codigo, nombre, subcategoria_id, precio_venta, 
                    precio_mayorista, costo_actual, es_sin_tac, 
                    requiere_refrigeracion, unidades_por_paquete, 
                    stock_minimo, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    codigo, nombre, subcategoria_id, precio_venta,
                    precio_mayorista, costo_actual, es_sin_tac,
                    requiere_refrigeracion, unidades_por_paquete,
                    stock_minimo, activo
                ]
            );

            // Insertar descuentos si existen
            if (descuentos && descuentos.length > 0) {
                const productoId = result.insertId;
                for (const descuento of descuentos) {
                    await connection.query(
                        `INSERT INTO producto_descuento (
                            producto_id, dia_semana, precio_descuento
                        ) VALUES (?, ?, ?)`,
                        [productoId, descuento.dia_semana, descuento.precio_descuento]
                    );
                }
            }

            await connection.commit();
            res.status(201).json({ message: 'Producto creado exitosamente' });
        } catch (error) {
            await connection.rollback();
            console.error('Error al crear producto:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Actualizar producto
    updateProducto: async (req, res) => {
        const { id } = req.params;
        const {
            codigo,
            nombre,
            subcategoria_id,
            precio_venta,
            precio_mayorista,
            costo_actual,
            es_sin_tac,
            requiere_refrigeracion,
            unidades_por_paquete,
            stock_minimo,
            activo,
            descuentos
        } = req.body;

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verificar permisos del usuario
            const userRole = req.user.rol;
            if (userRole === 'EMPLEADO') {
                // Empleados solo pueden actualizar precio_venta
                await connection.query(
                    'UPDATE producto SET precio_venta = ? WHERE producto_id = ?',
                    [precio_venta, id]
                );
            } else {
                // Actualización completa para ADMIN y DUEÑO
                await connection.query(
                    `UPDATE producto SET 
                        codigo = ?, nombre = ?, subcategoria_id = ?,
                        precio_venta = ?, precio_mayorista = ?, costo_actual = ?,
                        es_sin_tac = ?, requiere_refrigeracion = ?,
                        unidades_por_paquete = ?, stock_minimo = ?, activo = ?
                    WHERE producto_id = ?`,
                    [
                        codigo, nombre, subcategoria_id,
                        precio_venta, precio_mayorista, costo_actual,
                        es_sin_tac, requiere_refrigeracion,
                        unidades_por_paquete, stock_minimo, activo,
                        id
                    ]
                );

                // Actualizar descuentos
                if (descuentos) {
                    // Desactivar descuentos existentes
                    await connection.query(
                        'UPDATE producto_descuento SET activo = 0 WHERE producto_id = ?',
                        [id]
                    );

                    // Insertar nuevos descuentos
                    for (const descuento of descuentos) {
                        await connection.query(
                            `INSERT INTO producto_descuento (
                                producto_id, dia_semana, precio_descuento
                            ) VALUES (?, ?, ?)`,
                            [id, descuento.dia_semana, descuento.precio_descuento]
                        );
                    }
                }
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
    },

    // Toggle estado del producto
    toggleEstado: async (req, res) => {
        const { id } = req.params;
        const { activo } = req.body;

        try {
            await pool.query(
                'UPDATE producto SET activo = ? WHERE producto_id = ?',
                [activo, id]
            );
            res.json({ message: 'Estado actualizado exitosamente' });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener categorías
    getCategorias: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM categoria_producto WHERE activo = 1');
            res.json(rows);
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener subcategorías por categoría
    getSubcategorias: async (req, res) => {
        const { categoriaId } = req.params;
        try {
            const [rows] = await pool.query(
                'SELECT * FROM subcategoria_producto WHERE categoria_id = ? AND activo = 1',
                [categoriaId]
            );
            res.json(rows);
        } catch (error) {
            console.error('Error al obtener subcategorías:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = productosController;