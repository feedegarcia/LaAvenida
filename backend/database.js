const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',  // Este suele ser el usuario por defecto
    password: 'Fede1988!',   // Si no configuraste contrase�a, d�jalo vac�o
    database: 'sistema_pastas'
});

module.exports = pool;