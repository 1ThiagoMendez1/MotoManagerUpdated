const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/AccountingClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<Card className="bg-card border-border\/50 mt-6">[\s\S]*?Análisis y Comparación de Proveedores[\s\S]*?<\/Card>/;

content = content.replace(regex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed Analysis card');
