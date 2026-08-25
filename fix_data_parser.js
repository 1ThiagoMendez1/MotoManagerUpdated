const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldParsing = `      location: i.description || '',
      category: (i.category as any) || 'Repuestos',
      supplierPrice: Number(i.last_cost) || 0,
      supplier: i.supplier_id || '',`;

const newParsing = `      location: (() => {
        try {
          const parsed = JSON.parse(i.description || '{}');
          return parsed.location || '';
        } catch(e) {
          if (i.description && !i.description.startsWith('Proveedor:')) return i.description;
          return '';
        }
      })(),
      category: (i.category as any) || 'Repuestos',
      supplierPrice: Number(i.last_cost) || 0,
      supplier: (() => {
        try {
          const parsed = JSON.parse(i.description || '{}');
          return parsed.supplier || '';
        } catch(e) {
          if (i.description && i.description.startsWith('Proveedor:')) return i.description.replace('Proveedor: ', '').trim();
          return '';
        }
      })(),`;

content = content.replace(oldParsing, newParsing);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed data.ts to parse JSON description');
