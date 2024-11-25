const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.get('/', pedidosController.getPedidos);
router.get('/:id', pedidosController.getPedidoById);
router.post('/', pedidosController.createPedido);
router.patch('/:id/estado', pedidosController.updatePedidoEstado);
router.get('/:id/historial', pedidosController.getPedidoHistorial);
router.post('/:id/productos', pedidosController.agregarProductosAPedido);

module.exports = router;