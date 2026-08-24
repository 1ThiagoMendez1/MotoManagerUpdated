const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/AccountingClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update props
content = content.replace(
  "  inventory: InventoryItem[];\n}",
  "  inventory: InventoryItem[];\n  purchases?: any[];\n}"
);

// Update function signature
content = content.replace(
  "export default function AccountingClient({ subscriptionPlan, organizationId, inventory }: AccountingClientProps) {",
  "export default function AccountingClient({ subscriptionPlan, organizationId, inventory, purchases = [] }: AccountingClientProps) {"
);

// Format date helper if needed (we can do inline)
const oldEmptyState = `<div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                      <ShoppingCart className="h-10 w-10 mb-4 opacity-50" />
                      <p>Aún no has registrado ninguna compra.</p>
                      <p className="text-sm mt-2">Usa el botón "Registrar Compra" para ingresar mercadería masivamente a tu Bodega.</p>
                    </div>`;

const newPurchasesList = `
                    {purchases.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                        <ShoppingCart className="h-10 w-10 mb-4 opacity-50" />
                        <p>Aún no has registrado ninguna compra.</p>
                        <p className="text-sm mt-2">Usa el botón "Registrar Compra" para ingresar mercadería masivamente a tu Bodega.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                            <tr>
                              <th className="px-6 py-4 font-medium rounded-tl-lg">Fecha</th>
                              <th className="px-6 py-4 font-medium">Factura / Recibo</th>
                              <th className="px-6 py-4 font-medium">Proveedor</th>
                              <th className="px-6 py-4 font-medium">Estado</th>
                              <th className="px-6 py-4 font-medium rounded-tr-lg">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {purchases.map((p, i) => (
                              <tr key={i} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-muted-foreground">
                                  {new Date(p.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">{p.invoice_number || 'Sin número'}</td>
                                <td className="px-6 py-4 text-muted-foreground">{p.supplier?.name || 'Desconocido'}</td>
                                <td className="px-6 py-4">
                                  <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${
                                    p.status === 'received' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    p.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                                  }\`}>
                                    {p.status === 'received' ? 'Recibida en Bodega' : p.status === 'pending' ? 'Pendiente' : p.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-indigo-500">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
`;

content = content.replace(oldEmptyState, newPurchasesList);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AccountingClient purchases list');
