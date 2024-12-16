const fs = require('fs');
const path = require('path');

function restoreProject(inputFile) {
    console.log('Iniciando restauración del proyecto...');

    // Leer el archivo
    const content = fs.readFileSync(inputFile, 'utf8');

    // Separar estructura de contenido
    const [structurePart, contentPart] = content.split('\n\nContenido:\n');

    // Procesar el contenido
    const fileContents = contentPart.split('\n').reduce((acc, line) => {
        if (line.endsWith(':')) {
            // Nueva entrada de archivo, limpiamos la ruta
            const filePath = line.slice(0, -1)
                .replace('C:\\Users\\Administrador\\Documents\\LaAvenida\\', '')
                .replace('C:\\Users\\Administrador\\Documents\\LaAvenida\\la-avenida\\', '');
            acc.currentFile = filePath;
            acc.files[filePath] = '';
        } else if (acc.currentFile) {
            // Agregar contenido al archivo actual
            acc.files[acc.currentFile] += line + '\n';
        }
        return acc;
    }, { currentFile: null, files: {} });

    // Crear archivos
    Object.entries(fileContents.files).forEach(([filePath, content]) => {
        try {
            // Verificar que el archivo pertenece al proyecto
            if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
                // Crear directorio si no existe
                const dir = path.dirname(filePath);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`Creado directorio: ${dir}`);
                }

                // Escribir archivo
                fs.writeFileSync(filePath, content.trim());
                console.log(`Restaurado archivo: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error restaurando ${filePath}:`, error);
        }
    });

    console.log('Restauración completada.');
}

// Uso del script
const inputFile = path.join(process.env.USERPROFILE, 'Documents', 'project_structure.txt');

// Ejecutar restauración
restoreProject(inputFile);