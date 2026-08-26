const fs = require('fs');
const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ update sale_item[\s\S]*?\}\)\.eq\('sale_id', existingSale\.id\);/;
const match = code.match(regex);

if (match) {
  code = code.replace(match[0], '');
  fs.writeFileSync(path, code);
  console.log('sale_item update removed');
} else {
  console.log('regex failed for sale_item update');
}
