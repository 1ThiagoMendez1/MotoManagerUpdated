const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/EditInventoryItem.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add Switch import
content = content.replace(
  /import { Input } from '@\/components\/ui\/input';/,
  "import { Input } from '@/components/ui/input';\nimport { Switch } from '@/components/ui/switch';"
);

const formOld = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select name="category" defaultValue={item.category}>
                <SelectTrigger className="bg-card text-card-foreground border-border">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Ubicación</label>
              <Input name="location" defaultValue={item.location} placeholder="p. ej., Estante A-1" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Proveedor</label>
              <Input name="supplier" defaultValue={item.supplier} placeholder="p. ej., RepuestosExpress" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Proveedor (COP)</label>
              <CurrencyInput name="supplierPrice" defaultValue={item.supplierPrice} placeholder="22000" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad</label>
              <Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Venta (COP)</label>
              <CurrencyInput name="price" defaultValue={item.price} placeholder="35000" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>`;

const formNew = `          <div className="flex items-center space-x-2 py-2">
            <Switch id={\`trackInventory-\${item.id}\`} name="trackInventory" defaultChecked={item.trackInventory !== false} onCheckedChange={(checked) => {
              const el = document.getElementById(\`track-inventory-input-\${item.id}\`) as HTMLInputElement;
              if (el) el.value = checked ? 'true' : 'false';
            }} />
            <label htmlFor={\`trackInventory-\${item.id}\`} className="text-sm font-medium text-foreground cursor-pointer">
              Controlar Stock (Desmarcar para compras directas o sin stock fijo)
            </label>
            <input type="hidden" id={\`track-inventory-input-\${item.id}\`} name="trackInventoryVal" defaultValue={item.trackInventory !== false ? 'true' : 'false'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select name="category" defaultValue={item.category}>
                <SelectTrigger className="bg-card text-card-foreground border-border">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Venta (COP)</label>
              <CurrencyInput name="price" defaultValue={item.price} placeholder="35000" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Proveedor (Opcional)</label>
              <Input name="supplier" defaultValue={item.supplier} placeholder="p. ej., RepuestosExpress" className="bg-card text-card-foreground border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Último Costo / Precio Compra (COP)</label>
              <CurrencyInput name="supplierPrice" defaultValue={item.lastCost || item.supplierPrice} placeholder="22000" className="bg-card text-card-foreground border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad (Total actual: {item.quantity})</label>
              <Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-card text-card-foreground border-border" disabled title="Usa el módulo de compras o transferencias para modificar el stock" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-card text-card-foreground border-border" />
            </div>
          </div>`;

content = content.replace(formOld, formNew);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated EditInventoryItem');
