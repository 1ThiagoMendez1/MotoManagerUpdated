const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardMenu.tsx', 'utf-8');
content = content.replace(/<div id="tour-([a-z-]+)">/g, '<div id="tour-$1" className="h-full">');
content = content.replace(/className="md:col-span-8 lg:col-span-4"/g, 'className="md:col-span-8 lg:col-span-4 h-full"');
fs.writeFileSync('src/components/dashboard/DashboardMenu.tsx', content);
