const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function convertFilesToUTF8(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            convertFilesToUTF8(fullPath);
        } else if (path.extname(file) === '.vue' || path.extname(file) === '.js') {
            const content = fs.readFileSync(fullPath);
            const utf8Content = iconv.decode(content, 'ISO-8859-1');
            fs.writeFileSync(fullPath, utf8Content, 'utf8');
            console.log(`Converted: ${fullPath}`);
        }
    });
}

// Uso
convertFilesToUTF8('./src');