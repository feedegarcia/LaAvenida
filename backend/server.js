const express = require('express');
const cors = require('cors');
const app = express();

// Configuración de encoding
app.use(express.json({ extended: true, limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Establecer headers de encoding
app.use((req, res, next) => {
    res.header('Content-Type', 'application/json; charset=utf-8');
    next();
});

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Import routes
const eventosRoutes = require('./routes/eventos');
const sucursalesRoutes = require('./routes/sucursales');
const productosRoutes = require('./routes/productos');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const pedidosRoutes = require('./routes/pedidos');
const preferenciasRoutes = require('./routes/preferencias');
const tiposEventoRoutes = require('./routes/tiposEvento');
const stockRoutes = require('./routes/stock');

// Use routes
app.use('/api/eventos/tipos', tiposEventoRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/preferencias', preferenciasRoutes);
app.use('/api/stock', stockRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});