const pool = require('../config/database');

const getSucursales = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM SUCURSAL');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSucursales
};
