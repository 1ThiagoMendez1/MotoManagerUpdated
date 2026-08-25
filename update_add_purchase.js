const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/AddPurchase.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add RadioGroup import
content = content.replace(
  "import { Input } from '@/components/ui/input';",
  "import { Input } from '@/components/ui/input';\nimport { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';"
);

// Update schema
content = content.replace(
  "supplierId: z.string().optional(),\n  items:",
  "supplierId: z.string().optional(),\n  destination: z.enum(['warehouse', 'storefront']).default('warehouse'),\n  items:"
);

// Update defaultValues
content = content.replace(
  "invoiceNumber: '',\n      supplierId: '',\n      items:",
  "invoiceNumber: '',\n      supplierId: '',\n      destination: 'warehouse',\n      items:"
);

// Add radio group to UI
const radioUI = `
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="space-y-3 p-4 border border-border/50 rounded-lg bg-muted/5">
                  <FormLabel>Destino de la Mercancía</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="warehouse" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Directo a <b>Bodega</b> (Recomendado para almacenar)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 mt-2">
                        <FormControl>
                          <RadioGroupItem value="storefront" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Directo a <b>Vitrina / Comercial</b> (Para uso o venta inmediata)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
`;

content = content.replace(
  /<div className="space-y-4">\s*<div className="flex items-center justify-between">/g,
  radioUI + '\n            <div className="space-y-4">\n              <div className="flex items-center justify-between">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated AddPurchase UI');
