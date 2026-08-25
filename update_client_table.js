const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/InventoryClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCell = `                  <TableCell className="font-medium">
                      <div>{item.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{item.sku}</div>
                  </TableCell>`;

const newCell = `                  <TableCell className="font-medium">
                      <div>{item.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{item.sku}</div>
                      {item.location && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> {item.location}</div>}
                  </TableCell>`;

content = content.replace(oldCell, newCell);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated table display');
