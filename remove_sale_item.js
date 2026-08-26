const fs = require('fs');
const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /if \(newSale\) \{\s*await supabase\.from\('sale_items'\)\.insert\(\{[\s\S]*?\}\);\s*\}/;
const match = code.match(regex);

if (match) {
  code = code.replace(match[0], '');
  fs.writeFileSync(path, code);
  console.log('sale_item insert removed');
} else {
  console.log('regex failed for sale_item insert');
}
