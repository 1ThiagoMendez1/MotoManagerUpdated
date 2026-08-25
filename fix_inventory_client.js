const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/InventoryClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCell = `{item.location && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> {item.location}</div>}`;

const newCell = `{item.location && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> {item.location}</div>}
                      {item.supplier && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> Proveedor: {item.supplier}</div>}`;

content = content.replace(oldCell, newCell);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed inventory client display');
