const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const searchBlock = `    const fromLocId = formData.get('fromLocationId') as string;
    const toLocId = formData.get('toLocationId') as string;
    const qty = parseInt(formData.get('quantity') as string, 10);

    if (!itemId || !fromLocId || !toLocId || isNaN(qty) || qty <= 0) {
        return { message: 'Datos inválidos para el traslado.' };
    }`;

const replaceBlock = `    const fromLocId = formData.get('fromLocationId') as string;
    let toLocId = formData.get('toLocationId') as string;
    const qty = parseInt(formData.get('quantity') as string, 10);

    if (!itemId || !fromLocId || !toLocId || isNaN(qty) || qty <= 0) {
        return { message: 'Datos inválidos para el traslado.' };
    }

    // Si el toLocId es un string mágico (ej. 'storefront'), buscamos su ID real
    if (toLocId === 'storefront' || toLocId === 'warehouse') {
        const { data: realLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', toLocId)
            .maybeSingle();
        
        if (realLoc) {
            toLocId = realLoc.id;
        } else {
            return { message: 'No se encontró la ubicación de destino.' };
        }
    }`;

content = content.replace(searchBlock, replaceBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed transfer action backend logic');
