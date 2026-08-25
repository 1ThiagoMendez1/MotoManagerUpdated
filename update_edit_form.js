const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/EditInventoryItem.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldFields = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} className="bg-card text-card-foreground border-border" />
            </div>
          </div>`;

const newFields = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad Mínima de Alerta</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} className="bg-card text-card-foreground border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Ubicación Física Específica</label>
              <Input name="location" defaultValue={item.location} placeholder="p. ej., Estante 2, Fila B" className="bg-card text-card-foreground border-border" />
            </div>
          </div>`;

content = content.replace(oldFields, newFields);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated EditInventoryItem');
