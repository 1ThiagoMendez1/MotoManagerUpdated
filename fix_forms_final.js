const fs = require('fs');
const path = require('path');

// 1. Fix AddInventoryItem.tsx
const addPath = path.join(__dirname, 'src/components/forms/AddInventoryItem.tsx');
let addContent = fs.readFileSync(addPath, 'utf8');

const oldRadio = `<RadioGroup name="destination" defaultValue="storefront" className="flex flex-col space-y-1 mt-2">`;
const newRadio = `<input type="hidden" id="destination-input" name="destination" defaultValue="storefront" />
              <RadioGroup defaultValue="storefront" onValueChange={(val) => { document.getElementById('destination-input').value = val; }} className="flex flex-col space-y-1 mt-2">`;

addContent = addContent.replace(oldRadio, newRadio);
fs.writeFileSync(addPath, addContent, 'utf8');

// 2. Fix EditInventoryItem.tsx
const editPath = path.join(__dirname, 'src/components/forms/EditInventoryItem.tsx');
let editContent = fs.readFileSync(editPath, 'utf8');

const oldEditDiv = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad (Total actual: {item.quantity})</label>
              <Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" disabled title="Usa el módulo de compras o transferencias para modificar el stock" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-card text-card-foreground border-border" />
            </div>
          </div>`;

const newEditDiv = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad (Total actual: {item.quantity})</label>
              <Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" disabled title="Usa el módulo de compras o transferencias para modificar el stock" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-card text-card-foreground border-border" />
            </div>
          </div>
          
          <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Ubicación Física Específica</label>
              <Input name="location" defaultValue={item.location} placeholder="p. ej., Estante 2, Fila B" className="bg-card text-card-foreground border-border" />
          </div>`;

editContent = editContent.replace(oldEditDiv, newEditDiv);
fs.writeFileSync(editPath, editContent, 'utf8');

console.log('Fixed both forms!');
