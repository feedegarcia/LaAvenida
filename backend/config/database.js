const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Fede1988!',
    database: 'sistema_pastas',
    charset: 'utf8mb4',
    connectionLimit: 10
});

// Configurar la conexión para usar UTF-8
pool.on('connection', function (connection) {
    connection.query('SET NAMES utf8mb4');
    connection.query('SET CHARACTER SET utf8mb4');
    connection.query('SET character_set_connection=utf8mb4');
});

module.exports = pool;