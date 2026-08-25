const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the <TableCell> for location with the breakdown
const oldLocationCell = `<TableCell className="hidden lg:table-cell">{item.location}</TableCell>`;
const newLocationCell = `<TableCell className="hidden lg:table-cell">
                      {item.trackInventory === false ? (
                        <span className="text-muted-foreground italic">No controlado</span>
                      ) : (item.stockDetails && item.stockDetails.length > 0) ? (
                        <div className="flex flex-col gap-1 text-xs">
                          {item.stockDetails.map((sd: any, idx: number) => (
                            <div key={idx} className="flex justify-between w-24">
                              <span className="text-muted-foreground">{sd.locationName}:</span>
                              <span className="font-semibold">{sd.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Sin registro</span>
                      )}
                    </TableCell>`;

content = content.replace(oldLocationCell, newLocationCell);

// Also change the TableHead for location
const oldLocationHead = `<TableHead className="hidden lg:table-cell">Ubicación</TableHead>`;
const newLocationHead = `<TableHead className="hidden lg:table-cell">Stock por Ubicación</TableHead>`;
content = content.replace(oldLocationHead, newLocationHead);

// Also change the TableHead for quantity to be clearer
const oldQtyHead = `<TableHead className="text-right">Cantidad</TableHead>`;
const newQtyHead = `<TableHead className="text-right">Total Global</TableHead>`;
content = content.replace(oldQtyHead, newQtyHead);

// Update trackInventory logic for "Cantidad" column
const oldQtyCell = `<TableCell className="text-right">{item.quantity}</TableCell>`;
const newQtyCell = `<TableCell className="text-right">
                      {item.trackInventory === false ? '∞' : item.quantity}
                    </TableCell>`;
content = content.replace(oldQtyCell, newQtyCell);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Inventory table');
