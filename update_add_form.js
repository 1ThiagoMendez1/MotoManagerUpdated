const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/AddInventoryItem.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add RadioGroup imports
content = content.replace(
  "import { Input } from '@/components/ui/input';",
  "import { Input } from '@/components/ui/input';\nimport { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';"
);

// Add the new fields
const oldFields = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Inicial (Vitrina)</label>
              <Input name="quantity" type="number" placeholder="25" className="bg-card text-card-foreground border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" placeholder="10" className="bg-card text-card-foreground border-border" />
            </div>
          </div>`;

const newFields = `          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Lugar (Destino Inicial)</label>
              <RadioGroup name="destination" defaultValue="storefront" className="flex flex-col space-y-1 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="storefront" id="add-storefront" />
                  <label htmlFor="add-storefront" className="text-sm font-medium leading-none cursor-pointer">
                    Directo a <b>Vitrina</b>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="warehouse" id="add-warehouse" />
                  <label htmlFor="add-warehouse" className="text-sm font-medium leading-none cursor-pointer">
                    Directo a <b>Bodega</b>
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Inicial</label>
                <Input name="quantity" type="number" placeholder="25" className="bg-card text-card-foreground border-border" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground text-muted-foreground">Ubicación Física Específica</label>
                <Input name="location" placeholder="p. ej., Estante 2, Fila B" className="bg-card text-card-foreground border-border" />
              </div>
            </div>
          </div>
          
          <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima de Alerta</label>
              <Input name="minimumQuantity" type="number" placeholder="10" className="bg-card text-card-foreground border-border w-1/2" />
          </div>`;

content = content.replace(oldFields, newFields);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated AddInventoryItem');
