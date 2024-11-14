const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Ruta de login existente
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Intento de login:', { email }); // No logueamos password por seguridad

        // Buscar usuario
        const [users] = await pool.query(
            'SELECT u.*, r.nombre as rol FROM USUARIO u JOIN ROL r ON u.rol_id = r.rol_id WHERE email = ?',
            [email]
        );

        console.log('Usuario encontrado:', {
            encontrado: users.length > 0,
            usuario: users[0] ? {
                id: users[0].usuario_id,
                nombre: users[0].nombre,
                rol: users[0].rol,
                activo: users[0].activo
            } : null
        });

        const user = users[0];

        // Verificar password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password vÃ¡lido:', validPassword); // Debug

        if (!validPassword) {
            return res.status(401).json({ message: 'ContraseÃ±a incorrecta' });
        }

        // Generar token
        const token = jwt.sign(
            {
                id: user.usuario_id,
                rol: user.rol,
                sucursal_id: user.sucursal_id
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
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error); // Debug
        res.status(500).json({ message: 'Error del servidor', error: error.message });
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
            return res.status(400).json({ message: 'El email ya estÃ¡ registrado' });
        }

        // Generar hash de la contraseÃ±a
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
                sucursal_id: null
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
                rol: 'EMPLEADO'
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error del servidor', error: error.message });
    }
});

module.exports = router;
