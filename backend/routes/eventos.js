const express = require('express');
const router = express.Router();
const {
    getEventos,
    getTiposEvento,
    createEvento,
    updateEvento,
    deleteEvento,
    createTipoEvento
} = require('../controllers/eventosController');

router.get('/', getEventos);
router.get('/tipos', getTiposEvento);
router.post('/', createEvento);
router.patch('/:id', updateEvento);
router.delete('/:id', deleteEvento);
router.post('/tipos', createTipoEvento);

module.exports = router;