const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken } = require('../middleware/auth'); 

router.get('/:pedidoId/comparar-cambios', authenticateToken, pedidosController.compararCambios);
router.get('/', authenticateToken, pedidosController.getPedidos);
router.get('/:id', authenticateToken, pedidosController.getPedidoById);
router.post('/', authenticateToken, pedidosController.createPedido);
router.patch('/:id/estado', authenticateToken, pedidosController.updatePedidoEstado);
router.get('/:id/historial', authenticateToken, pedidosController.getPedidoHistorial);
router.post('/:id/productos', authenticateToken, pedidosController.agregarProductosAPedido);
router.get('/:id/productos/disponibles', authenticateToken, pedidosController.getProductosDisponibles);
router.delete('/:id/productos/:detalleId', authenticateToken, pedidosController.eliminarProductoDePedido);
router.patch('/:pedidoId/productos/:detalleId', authenticateToken, pedidosController.modificarCantidadProducto);
router.patch('/:pedidoId/productos/:detalleId/recibido', authenticateToken, pedidosController.marcarProductoRecibido);

module.exports = router;