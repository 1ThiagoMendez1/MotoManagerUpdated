const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/dashboard/DashboardMenu.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add ShoppingCart to imports
content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, function(match, imports) {
    if (!imports.includes('ShoppingCart')) {
        return `import {${imports}, ShoppingCart} from 'lucide-react';`;
    }
    return match;
});

// Add permission check
content = content.replace(/const canAccessSales = hasPermission\(role, '\/sales', customPermissions\);/, "const canAccessSales = hasPermission(role, '/sales', customPermissions);\n  const canAccessPurchases = hasPermission(role, '/purchases', customPermissions);"); // Assuming purchases has same permission or we just allow if canAccessInventory

// We will just use canAccessInventory for purchases for now
const purchasesNavItem = `
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
                </div>`;

content = content.replace(/(<div id="tour-inventory">[\s\S]*?<\/div>)/, "$1" + purchasesNavItem);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated DashboardMenu.tsx');
