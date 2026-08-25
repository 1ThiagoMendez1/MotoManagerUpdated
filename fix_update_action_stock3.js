const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldCondition = `    // Si antes NO controlaba stock y ahora SÍ controla, y mandaron una cantidad
    if (oldItem && oldItem.track_inventory === false && data.trackInventory) {`;

const newCondition = `    // Si el item antes no controlaba stock, la caja de cantidad estaba habilitada. 
    // Si el usuario tipeó algo, lo guardamos sin importar si encendió el switch o no.
    if (oldItem && oldItem.track_inventory === false) {`;

content = content.replace(oldCondition, newCondition);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed stock condition');
