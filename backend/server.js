const express = require('express');
const cors = require('cors');
const app = express();

// Import routes
const eventosRoutes = require('./routes/eventos');
const sucursalesRoutes = require('./routes/sucursales');
const productosRoutes = require('./routes/productos');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const pedidosRoutes = require('./routes/pedidos');
const preferenciasRoutes = require('./routes/preferencias');
const tiposEventoRoutes = require('./routes/tiposEvento');

// CORS and middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api/eventos/tipos', tiposEventoRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/preferencias', preferenciasRoutes);

const iconv = require('iconv-lite');
iconv.skipDecodeWarning = true;

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});