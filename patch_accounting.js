const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/AccountingClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldComprasTab = `{activeTab === 'compras' && isComplete && (
              <div className="space-y-6">
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      Análisis y Comparación de Proveedores
                    </CardTitle>
                    <CardDescription>Inteligencia de compras para optimizar tus márgenes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                          <tr>
                            <th className="px-6 py-4 font-medium rounded-tl-lg">Proveedor</th>
                            <th className="px-6 py-4 font-medium">Volumen Compras (Mes)</th>
                            <th className="px-6 py-4 font-medium">Tiempos de Envío</th>
                            <th className="px-6 py-4 font-medium rounded-tr-lg">Calificación IA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {supplierData.map((supplier, i) => (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{supplier.name}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(supplier.compras)}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{supplier.envios}</td>
                              <td className="px-6 py-4">
                                <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${
                                  supplier.calidad === 'Alta' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }\`}>
                                  {supplier.calidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}`;

const newComprasTab = `{activeTab === 'compras' && isComplete && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Gestión de Abastecimiento</h3>
                    <p className="text-sm text-muted-foreground">Registra facturas y reabastece tu inventario.</p>
                  </div>
                  <Button onClick={() => alert('Próximamente: Abrir modal de nueva compra')}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Registrar Compra
                  </Button>
                </div>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      Historial de Compras (Facturas)
                    </CardTitle>
                    <CardDescription>Tus ingresos de inventario recientes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                      <ShoppingCart className="h-10 w-10 mb-4 opacity-50" />
                      <p>Aún no has registrado ninguna compra.</p>
                      <p className="text-sm mt-2">Usa el botón "Registrar Compra" para ingresar mercadería masivamente a tu Bodega.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50 mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                      Análisis y Comparación de Proveedores
                    </CardTitle>
                    <CardDescription>Inteligencia de compras para optimizar tus márgenes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                          <tr>
                            <th className="px-6 py-4 font-medium rounded-tl-lg">Proveedor</th>
                            <th className="px-6 py-4 font-medium">Volumen Compras (Mes)</th>
                            <th className="px-6 py-4 font-medium">Tiempos de Envío</th>
                            <th className="px-6 py-4 font-medium rounded-tr-lg">Calificación IA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {supplierData.map((supplier, i) => (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{supplier.name}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(supplier.compras)}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{supplier.envios}</td>
                              <td className="px-6 py-4">
                                <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${
                                  supplier.calidad === 'Alta' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }\`}>
                                  {supplier.calidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}`;

content = content.replace(oldComprasTab, newComprasTab);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched AccountingClient');
