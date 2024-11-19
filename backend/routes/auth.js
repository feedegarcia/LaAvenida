const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Ruta de login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Intento de login:', { email });

        // Primero, buscar el usuario básico
        const [users] = await pool.query(`
            SELECT u.*, r.nombre as rol 
            FROM USUARIO u 
            JOIN ROL r ON u.rol_id = r.rol_id
            WHERE email = ?
            LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const user = users[0];

        // Luego, obtener todas sus sucursales activas
        const [userSucursales] = await pool.query(`
            SELECT DISTINCT us.sucursal_id, s.nombre as sucursal_nombre
            FROM usuario_sucursal us 
            JOIN sucursal s ON us.sucursal_id = s.sucursal_id
            WHERE us.usuario_id = ? AND us.activo = 1`,
            [user.usuario_id]
        );

        const sucursales = userSucursales.map(s => ({
            id: s.sucursal_id,
            nombre: s.sucursal_nombre
        }));

        console.log('Usuario encontrado:', {
            id: user.usuario_id,
            nombre: user.nombre,
            rol: user.rol,
            sucursales: sucursales
        });

        // Verificar password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar token con array de sucursales
        const token = jwt.sign(
            {
                id: user.usuario_id,
                rol: user.rol,
                sucursales: sucursales
            },
            'secret_key',
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.usuario_id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                sucursales: sucursales
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            message: 'Error del servidor',
            error: error.message
        });
    }
});

// Nueva ruta para registro
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // Verificar si el email ya existe
        const [existingUsers] = await pool.query(
            'SELECT * FROM USUARIO WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Generar hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario con rol EMPLEADO por defecto
        const [result] = await pool.query(
            `INSERT INTO USUARIO (
                nombre, 
                email, 
                password, 
                rol_id, 
                activo
            ) VALUES (
                ?, 
                ?, 
                ?, 
                (SELECT rol_id FROM ROL WHERE nombre = 'EMPLEADO'),
                1
            )`,
            [nombre, email, hashedPassword]
        );

        // Crear token para el nuevo usuario
        const token = jwt.sign(
            {
                id: result.insertId,
                rol: 'EMPLEADO',
                sucursales: []
            },
            'secret_key',
            { expiresIn: '8h' }
        );

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token,
            user: {
                id: result.insertId,
                nombre,
                email,
                rol: 'EMPLEADO',
                sucursales: []
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error del servidor', error: error.message });
    }
});

module.exports = router;