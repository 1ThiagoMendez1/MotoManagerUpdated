const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/dashboard/DashboardMenu.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const badCode = `              {canAccessInventory && (
                <div id="tour-inventory">
                  <AppleGlassCard 
                    href="/inventory"
                    icon={Warehouse}
                    title="Inventario"
                    description="Control de repuestos y stock."
                    iconBg="bg-amber-500"
                    locked={!planLimits.has_inventory}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Inventario', description: 'Control de repuestos y stock.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
                <div id="tour-purchases">
                  <NavItem
                    href="/purchases"
                    icon={<ShoppingCart className="h-4 w-4" />}
                    isActive={pathname === '/purchases' || pathname.startsWith('/purchases/')}
                    locked={!planLimits.has_inventory}
                    hasPermission={canAccessInventory}
                  >
                    Compras
                  </NavItem>
                </div>
              )}`;

const goodCode = `              {canAccessInventory && (
                <>
                <div id="tour-inventory">
                  <AppleGlassCard 
                    href="/inventory"
                    icon={Warehouse}
                    title="Inventario"
                    description="Control de repuestos y stock."
                    iconBg="bg-amber-500"
                    locked={!planLimits.has_inventory}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Inventario', description: 'Control de repuestos y stock.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
                <div id="tour-purchases">
                  <AppleGlassCard 
                    href="/purchases"
                    icon={ShoppingCart}
                    title="Compras"
                    description="Ingreso de mercancía."
                    iconBg="bg-amber-600"
                    locked={!planLimits.has_inventory}
                    onClickLocked={() => {
                      setUpgradeModule({ title: 'Compras', description: 'Módulo de compras e ingresos.' });
                      setShowUpgradeModal(true);
                    }}
                  />
                </div>
                </>
              )}`;

content = content.replace(badCode, goodCode);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed DashboardMenu');
