const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/AddPurchase.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// I'll define a sub-component for the combobox to manage its own open state.
const comboboxComponent = `
function InventoryCombobox({ inventory, value, onSelect }: { inventory: any[], value: string, onSelect: (val: string, name: string, cost: number) => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal text-left truncate px-3 bg-card border-border",
              !value && "text-muted-foreground"
            )}
          >
            {value
              ? (() => {
                  const selected = inventory.find(i => i.id === value);
                  return selected ? \`\${selected.sku} - \${selected.name}\` : "Repuesto seleccionado";
                })()
              : "Buscar repuesto..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nombre o SKU..." />
          <CommandList>
            <CommandEmpty>No se encontraron repuestos.</CommandEmpty>
            <CommandGroup>
              {inventory.map((item) => (
                <CommandItem
                  value={\`\${item.sku} \${item.name}\`}
                  key={item.id}
                  onSelect={() => {
                    const defaultCost = item.lastCost || item.supplierPrice || 0;
                    onSelect(item.id, item.name, defaultCost);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      item.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.sku} - {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
`;

// Insert the component before export function AddPurchase
content = content.replace('export function AddPurchase', comboboxComponent + '\nexport function AddPurchase');

// Replace the Popover inline code with the component
const oldPopoverRegex = /<Popover modal=\{true\}>[\s\S]*?<\/Popover>/;

content = content.replace(oldPopoverRegex, `<InventoryCombobox 
                                inventory={inventory.filter(i => i.trackInventory !== false)} 
                                value={itemField.value}
                                onSelect={(id, name, cost) => {
                                  itemField.onChange(id);
                                  form.setValue(\`items.\${index}.name\`, name);
                                  form.setValue(\`items.\${index}.unitCost\`, cost);
                                }}
                              />`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed combobox state');
