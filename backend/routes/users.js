const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                u.usuario_id, 
                u.nombre, 
                u.email, 
                u.activo,
                u.rol_id,
                r.nombre as rol
            FROM USUARIO u
            JOIN ROL r ON u.rol_id = r.rol_id
        `);

        // Obtener las sucursales para cada usuario
        for (let user of users) {
            const [sucursales] = await pool.query(`
                SELECT s.sucursal_id, s.nombre
                FROM sucursal s
                JOIN usuario_sucursal us ON s.sucursal_id = us.sucursal_id
                WHERE us.usuario_id = ? AND us.activo = 1
            `, [user.usuario_id]);

            user.sucursales = sucursales;
        }

        res.json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

// Crear nuevo usuario
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { nombre, email, password, rol_id, sucursales } = req.body;

        // Validaciones
        if (!nombre || !email || !password || !rol_id) {
            return res.status(400).json({
                message: 'Faltan campos requeridos',
                details: {
                    nombre: !nombre,
                    email: !email,
                    password: !password,
                    rol_id: !rol_id
                }
            });
        }

        // Verificar si el email ya existe
        const [existingUsers] = await connection.query(
            'SELECT usuario_id FROM USUARIO WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                message: 'El email ya estÃ¡ registrado'
            });
        }

        // Hash del password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        // Crear usuario
        const [result] = await connection.query(
            `INSERT INTO USUARIO (nombre, email, password, rol_id, activo) 
             VALUES (?, ?, ?, ?, true)`,
            [nombre, email, hashedPassword, rol_id]
        );

        const usuario_id = result.insertId;

        // Insertar relaciones con sucursales
        if (sucursales && sucursales.length > 0) {
            const values = sucursales.map(sucursal_id =>
                [usuario_id, sucursal_id, new Date()]
            );

            await connection.query(
                `INSERT INTO usuario_sucursal 
                 (usuario_id, sucursal_id, fecha_inicio) 
                 VALUES ?`,
                [values]
            );
        }

        await connection.commit();
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            usuario_id
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error detallado:', error);
        res.status(500).json({
            message: 'Error al crear usuario',
            error: error.message
        });
    } finally {
        connection.release();
    }
});


router.get('/:id/sucursales', async (req, res) => {
    try {
        const [sucursales] = await pool.query(
            `SELECT s.*, us.activo as relacion_activa
             FROM sucursal s
             JOIN usuario_sucursal us ON s.sucursal_id = us.sucursal_id
             WHERE us.usuario_id = ? AND us.activo = 1 AND s.activo = 1`,
            [req.params.id]
        );

        res.json(sucursales);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener sucursales del usuario',
            error: error.message
        });
    }
});

// Actualizar usuario
// En el backend (routes/users.js)
router.patch('/:id', async (req, res) => {
    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()

        const { id } = req.params
        const { nombre, rol_id, sucursales } = req.body

        // Actualizar datos bÃ¡sicos del usuario
        await connection.query(
            `UPDATE USUARIO SET nombre = ?, rol_id = ? WHERE usuario_id = ?`,
            [nombre, rol_id, id]
        )

        // Eliminar TODAS las relaciones existentes
        await connection.query(
            `DELETE FROM usuario_sucursal WHERE usuario_id = ?`,
            [id]
        )

        // Insertar solo las nuevas seleccionadas
        if (sucursales && sucursales.length > 0) {
            const values = sucursales.map(sucursal_id => [
                id,
                sucursal_id,
                new Date(),
                1
            ])

            await connection.query(
                `INSERT INTO usuario_sucursal 
                    (usuario_id, sucursal_id, fecha_inicio, activo) 
                 VALUES ?`,
                [values]
            )
        }

        await connection.commit()

        res.json({
            message: 'Usuario actualizado exitosamente'
        })

    } catch (error) {
        await connection.rollback()
        console.error('Error:', error)
        res.status(500).json({
            message: 'Error al actualizar usuario',
            error: error.message
        })
    } finally {
        connection.release()
    }
})

// Actualizar estado del usuario
router.patch('/:id/status', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { activo } = req.body;

        await connection.query(
            'UPDATE USUARIO SET activo = ? WHERE usuario_id = ?',
            [activo, id]
        );

        await connection.commit();
        res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al actualizar estado',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Obtener roles
router.get('/roles', async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM ROL');
        res.json(roles);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Error al obtener roles',
            error: error.message
        });
    }
});

module.exports = router;
