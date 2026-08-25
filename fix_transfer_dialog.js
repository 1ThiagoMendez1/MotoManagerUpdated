const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/TransferStockDialog.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCheck = `      if (!bodegaStock || !vitrinaStock) {
          toast({ title: "Error", description: "No se encontraron las ubicaciones.", variant: "destructive" });
          setIsSubmitting(false);
          return;
      }`;

const newCheck = `      if (!bodegaStock) {
          toast({ title: "Error", description: "No hay stock en Bodega para trasladar.", variant: "destructive" });
          setIsSubmitting(false);
          return;
      }`;

const oldAppend = `      formData.append('fromLocationId', bodegaStock.locationId);
      formData.append('toLocationId', vitrinaStock.locationId);`;

const newAppend = `      formData.append('fromLocationId', bodegaStock.locationId);
      // Si no hay stock previo en vitrina, le enviamos 'storefront' para que el backend lo resuelva
      formData.append('toLocationId', vitrinaStock?.locationId || 'storefront');`;

content = content.replace(oldCheck, newCheck);
content = content.replace(oldAppend, newAppend);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed TransferStockDialog frontend logic');
