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

        // Identificar si el usuario es de una sucursal fabrica
        const sucursalesFabrica = userSucursales
            .filter(s => s.tipo === 'FABRICA_VENTA')
            .map(s => s.sucursal_id);

        // Construir la condicion WHERE dinamicamente
        let whereCondition = 'p.activo = TRUE AND (';
        let params = [];

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
            WHERE ${whereCondition}
        `, params);

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
                // No agrupar productos de la propia fabrica
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

module.exports = router;