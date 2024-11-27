const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.get('/', pedidosController.getPedidos);
router.get('/:id', pedidosController.getPedidoById);
router.post('/', pedidosController.createPedido);
router.patch('/:id/estado', pedidosController.updatePedidoEstado);
router.get('/:id/historial', pedidosController.getPedidoHistorial);
router.post('/:id/productos', pedidosController.agregarProductosAPedido);
router.get('/:id/productos/disponibles', pedidosController.getProductosDisponibles); // Nueva ruta
router.delete('/:id/productos/:detalleId', pedidosController.eliminarProductoDePedido); // Nueva ruta

module.exports = router;