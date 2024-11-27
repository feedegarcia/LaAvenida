const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

router.get('/pedido', async (req, res) => {
    try {
        // Obtener el token y decodificarlo
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'secret_key');

        // Obtener las sucursales del usuario
        const [userSucursales] = await pool.query(`
            SELECT us.sucursal_id, s.tipo 
            FROM usuario_sucursal us 
            JOIN sucursal s ON us.sucursal_id = s.sucursal_id 
            WHERE us.usuario_id = ? AND us.activo = 1`,
            [decodedToken.id]
        );

        // Identificar si el usuario es de una sucursal fábrica
        const sucursalesFabrica = userSucursales
            .filter(s => s.tipo === 'FABRICA_VENTA')
            .map(s => s.sucursal_id);

        // Construir la consulta SQL base
        const baseQuery = `
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
                COALESCE(stk.cantidad, 0) as stock,
                (
                    SELECT MAX(dp.cantidad_solicitada)
                    FROM detalle_pedido dp
                    JOIN pedido ped ON dp.pedido_id = ped.pedido_id
                    WHERE dp.producto_id = p.producto_id
                    AND ped.sucursal_origen IN (${userSucursales.map(s => s.sucursal_id).join(',') || '0'})
                    ORDER BY ped.fecha_pedido DESC
                    LIMIT 1
                ) as ultimo_pedido
            FROM PRODUCTO p
            JOIN origen_producto op ON p.origen_id = op.origen_id
            LEFT JOIN sucursal s ON COALESCE(op.sucursal_fabricante_id, op.lugar_pedido_defecto) = s.sucursal_id
            LEFT JOIN STOCK stk ON p.producto_id = stk.producto_id
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE p.activo = TRUE`;

        // Construir condición WHERE dinámica según permisos
        let whereCondition = ' AND (';
        if (['ADMIN', 'DUEÑO'].includes(decodedToken.rol)) {
            whereCondition += `
                (op.tipo = 'ELABORACION_PROPIA' AND s.tipo = 'FABRICA_VENTA')
                OR op.tipo = 'TERCEROS'
                OR p.es_sin_tac = 1
            `;
        } else {
            whereCondition += `
                (
                    (
                        op.tipo = 'ELABORACION_PROPIA' 
                        AND s.tipo = 'FABRICA_VENTA'
                        AND op.sucursal_fabricante_id NOT IN (${sucursalesFabrica.length > 0 ? sucursalesFabrica.join(',') : '0'})
                    )
                    OR op.tipo = 'TERCEROS'
                    OR p.es_sin_tac = 1
                )
            `;
        }
        whereCondition += ')';

        // Ejecutar consulta
        const [rows] = await pool.query(baseQuery + whereCondition);

        // Agrupar resultados
        const agrupados = {
            fabricas: {},
            sinTac: [],
            varios: []
        };

        if (!rows || rows.length === 0) {
            return res.json(agrupados);
        }

        // Procesar y agrupar resultados
        rows.forEach(producto => {
            if (producto.es_sin_tac) {
                if (!agrupados.sinTac.find(p => p.producto_id === producto.producto_id)) {
                    agrupados.sinTac.push(producto);
                }
            } else if (producto.tipo_origen === 'ELABORACION_PROPIA') {
                const sucursalId = producto.sucursal_pedido;

                // No agrupar productos de la propia fábrica
                if (!sucursalesFabrica.includes(sucursalId)) {
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

                    const productoExistente = agrupados.fabricas[sucursalId]
                        .subcategorias[producto.subcategoria_id].productos
                        .find(p => p.producto_id === producto.producto_id);

                    if (!productoExistente) {
                        agrupados.fabricas[sucursalId]
                            .subcategorias[producto.subcategoria_id].productos.push(producto);
                    }
                }
            } else if (!agrupados.varios.find(p => p.producto_id === producto.producto_id)) {
                agrupados.varios.push(producto);
            }
        });

        return res.json(agrupados);
    } catch (error) {
        console.error('Error detallado en /pedido:', error);
        return res.status(500).json({
            message: 'Error al obtener productos',
            error: error.message,
            stack: error.stack
        });
    }
});

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

module.exports = router;