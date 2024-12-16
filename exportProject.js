const fs = require('fs');
const path = require('path');
const os = require('os');

// Define las extensiones de archivos que deseas incluir
const allowedExtensions = ['.js', '.vue', '.html', '.css'];

// Carpeta donde se guardara el archivo de salida
const outputDir = path.join(os.homedir(), 'Documents');
const outputFile = path.join(outputDir, 'project_structure.txt');

// Carpetas a excluir
const excludeFolders = ['node_modules', '.git', '.vs', 'dist'];

// Funcion para recorrer toda la estructura de carpetas
function readDirectoryAndContent(dirPath, indent = '', structureArray = [], contentArray = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !excludeFolders.includes(file)) {
            // Añade la carpeta a la estructura
            structureArray.push(`${indent}${file}/`);
            // Recursion para subdirectorios
            readDirectoryAndContent(filePath, indent + '  ', structureArray, contentArray);
        } else {
            const extname = path.extname(file);
            if (allowedExtensions.includes(extname)) {
                // Añade el archivo a la estructura
                structureArray.push(`${indent}${file}`);

                // Lee el contenido del archivo
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    contentArray.push(`\n${filePath}:\n${content}`);
                } catch (error) {
                    console.error(`Error al leer el archivo ${filePath}: ${error.message}`);
                }
            }
        }
    });

    return { structureArray, contentArray };
}

// Ruta principal del proyecto
const projectPath = path.resolve(__dirname);

// Recorrer la estructura del proyecto y leer contenidos
const { structureArray, contentArray } = readDirectoryAndContent(projectPath);

// Escribir el archivo de salida
let output = 'Estructura:\n';
output += structureArray.join('\n'); // Agregar estructura al archivo
output += '\n\nContenido:\n';
output += contentArray.join('\n'); // Agregar contenido al archivo

fs.writeFileSync(outputFile, output);
console.log(`Estructura y contenido exportados a ${outputFile}`);