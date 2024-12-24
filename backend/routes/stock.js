const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/:sucursalId', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { sucursalId } = req.params;

        // Verificar que el ID es válido
        if (!sucursalId || isNaN(parseInt(sucursalId))) {
            return res.status(400).json({ message: 'ID de sucursal inválido' });
        }

        // Verificar acceso del usuario a la sucursal
        const tieneAcceso = req.user.sucursales.some(s => s.id === parseInt(sucursalId));
        if (!tieneAcceso) {
            return res.status(403).json({ message: 'No tiene acceso a esta sucursal' });
        }

        connection = await pool.getConnection();

        // Obtener stock actual
        const [productos] = await connection.query(`
            SELECT 
                p.*,
                COALESCE(s.cantidad, 0) as stock_actual,
                p.stock_minimo,
                cp.nombre as categoria_nombre,
                sp.nombre as subcategoria_nombre,
                (
                    SELECT SUM(dp.cantidad_solicitada)
                    FROM detalle_pedido dp
                    JOIN pedido pe ON dp.pedido_id = pe.pedido_id
                    WHERE dp.producto_id = p.producto_id
                    AND pe.sucursal_destino = ?
                    AND pe.estado IN ('EN_FABRICA', 'EN_FABRICA_MODIFICADO', 'PREPARADO', 'PREPARADO_MODIFICADO')
                ) as en_camino
            FROM producto p
            LEFT JOIN stock s ON p.producto_id = s.producto_id AND s.sucursal_id = ?
            JOIN subcategoria_producto sp ON p.subcategoria_id = sp.subcategoria_id
            JOIN categoria_producto cp ON sp.categoria_id = cp.categoria_id
            WHERE p.activo = 1
            ORDER BY cp.nombre, sp.nombre, p.nombre
        `, [sucursalId, sucursalId]);

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener stock:', error);
        res.status(500).json({ message: 'Error al obtener stock' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;