// backend/generateHash.js - Este archivo lo usaremos solo una vez
const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = '1234';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log('Ejecuta este SQL con el hash generado:');
    console.log(`
        INSERT INTO USUARIO (nombre, email, password, rol_id, activo) 
        VALUES (
            'Admin', 
            'admin@laavenida.com',
            '${hash}',
            (SELECT rol_id FROM ROL WHERE nombre = 'ADMIN'),
            1
        );
    `);
}

generateHash();
