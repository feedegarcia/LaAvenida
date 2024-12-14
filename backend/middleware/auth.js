const jwt = require('jsonwebtoken');

<<<<<<< Updated upstream
=======
// Middleware principal de autenticacion
>>>>>>> Stashed changes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
<<<<<<< Updated upstream
        return res.status(401).json({ message: 'No se proporcionÃ³ token de acceso' });
=======
        return res.status(401).json({ message: 'No se proporciono token de acceso' });
>>>>>>> Stashed changes
    }

    try {
        // Usamos la misma clave que en auth.js
        const decoded = jwt.verify(token, 'secret_key');
<<<<<<< Updated upstream
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token invÃ¡lido' });
=======
        req.user = {
            ...decoded,
            sucursal_id: decoded.sucursales[0]?.id
        };
        next();
    } catch (error) {
        console.error('Error de autenticacion:', error);
        return res.status(403).json({ message: 'Token invalido' });
>>>>>>> Stashed changes
    }
};

// Middleware para verificar roles
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return res.status(403).json({
                message: 'No tiene los permisos necesarios para esta accion'
            });
        }
        next();
    };
};

// Middleware para verificar acceso a sucursal
const checkSucursal = (req, res, next) => {
    const sucursalId = parseInt(req.body.sucursal_id || req.query.sucursal_id);

    if (!req.user.sucursales) {
        return res.status(403).json({ message: 'Usuario sin sucursales asignadas' });
    }

    const tieneAcceso = req.user.sucursales.some(s => s.id === sucursalId);
    if (!tieneAcceso) {
        return res.status(403).json({ message: 'No tiene acceso a esta sucursal' });
    }
    next();
};

// Middleware para permisos de productos
const checkProductPermissions = (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH') {
        if (req.user.rol === 'EMPLEADO') {
            // Verificar que solo este modificando precio_venta
            const permitidos = ['precio_venta'];
            const camposModificados = Object.keys(req.body);

            const tienePermiso = camposModificados.every(campo => permitidos.includes(campo));
            if (!tienePermiso) {
                return res.status(403).json({
                    message: 'Como empleado solo puede modificar el precio de venta'
                });
            }
        }
    }
    next();
};

module.exports = {
    authenticateToken,
    checkRole,
    checkSucursal,
    checkProductPermissions
};