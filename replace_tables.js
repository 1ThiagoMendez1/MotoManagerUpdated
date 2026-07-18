const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

walk('./src', function(err, results) {
  if (err) throw err;
  
  const files = results.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  let changedFiles = 0;
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/\.from\('customers'\)/g, ".from('clientes')");
    content = content.replace(/\.from\('technicians'\)/g, ".from('tecnicos_activos')");
    content = content.replace(/customer:customers/g, 'customer:clientes');
    content = content.replace(/technician:technicians/g, 'technician:tecnicos_activos');
    content = content.replace(/customers \(/g, 'clientes (');
    content = content.replace(/reminder\.customers/g, 'reminder.clientes');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated', file);
      changedFiles++;
    }
  }
  console.log('Total files changed in src:', changedFiles);
});
