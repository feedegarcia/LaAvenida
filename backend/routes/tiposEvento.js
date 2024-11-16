const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getTiposEvento,
    createTipoEvento,
    deleteTipoEvento
} = require('../controllers/tiposEventoController');

// Rutas para tipos de evento
router.get('/', authenticateToken, getTiposEvento);
router.post('/', authenticateToken, createTipoEvento);
router.delete('/:id', authenticateToken, deleteTipoEvento);

module.exports = router;