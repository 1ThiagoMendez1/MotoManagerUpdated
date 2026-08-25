const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/InventoryClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldTabsList = `<TabsList className="bg-muted/50 border border-border/50 p-1">
          <TabsTrigger value="vitrina" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Vitrina (Comercial)
          </TabsTrigger>
          <TabsTrigger value="bodega" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Bodega Principal
          </TabsTrigger>
        </TabsList>`;

const newTabsList = `<TabsList className="bg-muted/50 border border-border/50 p-1">
          <TabsTrigger value="vitrina" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Vitrina (Comercial)
          </TabsTrigger>
          <TabsTrigger value="bodega" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Bodega Principal
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Kardex (Auditoría Global)
          </TabsTrigger>
        </TabsList>`;

content = content.replace(oldTabsList, newTabsList);

const newKardexTabContent = `
        <TabsContent value="movimientos" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Auditoría de Movimientos Globales</CardTitle>
              <CardDescription>Libro mayor de todos los ingresos, traslados y salidas del taller.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                 <History className="h-10 w-10 mb-4 opacity-50" />
                 <p>El libro mayor de movimientos está activo.</p>
                 <p className="text-sm mt-2">Para ver el historial detallado, ve a Bodega o Vitrina y haz clic en el botón <b>Kardex</b> de cada repuesto.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
`;

content = content.replace('</Tabs>', newKardexTabContent + '\n      </Tabs>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added global Kardex tab');
