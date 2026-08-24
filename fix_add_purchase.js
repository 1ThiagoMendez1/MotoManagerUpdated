const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/AddPurchase.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { ShoppingCart, PlusCircle, Trash2, Loader2, PackageSearch } from 'lucide-react';",
  "import { ShoppingCart, PlusCircle, Trash2, Loader2, PackageSearch, Check, ChevronsUpDown } from 'lucide-react';\nimport { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';\nimport { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';\nimport { cn } from '@/lib/utils';"
);

// 2. Remove Select imports
content = content.replace(
  /import \{\s*Select,\s*SelectContent,\s*SelectItem,\s*SelectTrigger,\s*SelectValue,\s*\} from '@\/components\/ui\/select';/g,
  ""
);

// 3. Replace the Select component with Combobox
const selectCode = `<Select 
                                onValueChange={(val) => {
                                  itemField.onChange(val);
                                  const selectedProduct = inventory.find(i => i.id === val);
                                  if (selectedProduct) {
                                    form.setValue(\`items.\${index}.name\`, selectedProduct.name);
                                    // Use lastCost or supplierPrice as default unitCost
                                    const defaultCost = selectedProduct.lastCost || selectedProduct.supplierPrice || 0;
                                    form.setValue(\`items.\${index}.unitCost\`, defaultCost);
                                  }
                                }}
                                value={itemField.value}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Buscar repuesto..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {inventory.filter(i => i.trackInventory !== false).map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.sku} - {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>`;

const comboboxCode = `<Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between font-normal text-left truncate px-3 bg-card border-border",
                                        !itemField.value && "text-muted-foreground"
                                      )}
                                    >
                                      {itemField.value
                                        ? (() => {
                                            const selected = inventory.find(i => i.id === itemField.value);
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
                                        {inventory.filter(i => i.trackInventory !== false).map((item) => (
                                          <CommandItem
                                            value={\`\${item.sku} \${item.name}\`}
                                            key={item.id}
                                            onSelect={() => {
                                              itemField.onChange(item.id);
                                              form.setValue(\`items.\${index}.name\`, item.name);
                                              const defaultCost = item.lastCost || item.supplierPrice || 0;
                                              form.setValue(\`items.\${index}.unitCost\`, defaultCost);
                                              // Cerrar popover automáticamente (se hace internamente por radix pero para asegurar state si quisiéramos)
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                item.id === itemField.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {item.sku} - {item.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>`;

content = content.replace(selectCode, comboboxCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AddPurchase');
