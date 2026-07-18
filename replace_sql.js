const fs = require('fs');
const glob = require('glob');

const sqlFiles = [
  'supa-schema.sql',
  'full-migration.sql',
  'admin-schema-update.sql',
  'fix-full-setup.sql',
  'update-missing-schema.sql'
];

for (const file of sqlFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/public\.customers/g, 'public.clientes');
    content = content.replace(/public\.technicians/g, 'public.tecnicos_activos');
    
    // Some foreign keys refer to customers(id)
    content = content.replace(/references public\.clientes\(id\)/g, 'references public.clientes(id)');

    // In case the tables were created directly without public.
    content = content.replace(/table customers/g, 'table clientes');
    content = content.replace(/table technicians/g, 'table tecnicos_activos');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated SQL file:', file);
    }
  }
}
