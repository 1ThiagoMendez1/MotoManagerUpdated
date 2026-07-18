const fs = require('fs');
const path = require('path');

function search(dir, keyword) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath, keyword);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(keyword)) {
        console.log(fullPath);
      }
    }
  }
}

search('./src', 'MarkerPopup');
search('./src', 'MarkerTooltip');
