const jwt = require('jsonwebtoken');

// En el middleware de autenticación (auth.js)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token de acceso' });
    }

    try {
        const decoded = jwt.verify(token, 'secret_key');
        // Asegurar que el usuario y sus sucursales estén en el request
        req.user = {
            ...decoded,
            sucursal_id: decoded.sucursales[0]?.id // Agregar sucursal_id explícitamente
        };
        next();
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(403).json({ message: 'Token inválido' });
    }
}

module.exports = {
    authenticateToken
};
