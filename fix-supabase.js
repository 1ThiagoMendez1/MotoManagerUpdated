const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Need to check if glob is installed, if not we can use recursive readdir

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') {
        if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx') || dirFile.endsWith('.js') || dirFile.endsWith('.jsx')) {
          filelist.push(dirFile);
        }
      }
    }
  });
  return filelist;
}

const files = walkSync('./src');
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace createSupabaseClient calls that have 2 arguments with 3 arguments
  // Regex to match: createSupabaseClient( arg1, arg2 )
  const regex = /createSupabaseClient\(\s*([^,]+),\s*([^,\)]+)\s*\)/g;
  
  content = content.replace(regex, (match, arg1, arg2) => {
    // If the second arg contains 'options', it might already be fixed
    if (arg2.includes('{') || arg2.includes('auth:')) {
      return match;
    }
    return `createSupabaseClient(\n    ${arg1.trim()},\n    ${arg2.trim()},\n    { auth: { persistSession: false } }\n  )`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
    changedCount++;
  }
}
console.log('Total files fixed:', changedCount);
