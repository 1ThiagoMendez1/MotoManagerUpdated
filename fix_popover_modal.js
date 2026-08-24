const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/forms/AddPurchase.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/<Popover>/g, '<Popover modal={true}>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed popover modal');
