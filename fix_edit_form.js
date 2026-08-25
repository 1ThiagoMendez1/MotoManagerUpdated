const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/EditInventoryItem.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldQuantity = `<Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" disabled title="Usa el módulo de compras o transferencias para modificar el stock" />`;
const newQuantity = `<Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" disabled={item.trackInventory !== false} title={item.trackInventory !== false ? "Usa el módulo de compras o transferencias para modificar el stock" : "Ingresa el stock inicial para empezar a controlar"} />`;

content = content.replace(oldQuantity, newQuantity);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Edit form to allow initial quantity');
