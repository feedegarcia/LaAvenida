const express = require('express');
const router = express.Router();
const { getFeriados, toggleFeriado } = require('../controllers/feriadosController');

// Quitamos authenticateToken de todas las rutas
router.get('/', getFeriados);
router.patch('/:id/toggle', toggleFeriado);

module.exports = router;
