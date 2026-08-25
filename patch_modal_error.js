const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/inventory/ItemKardexModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard variables
content = content.replace(
  "const [isLoading, setIsLoading] = useState(false);",
  "const [isLoading, setIsLoading] = useState(false);\n  const [errorMsg, setErrorMsg] = useState('');"
);

content = content.replace(
  "if (error) console.error('Error fetching kardex:', error);",
  "if (error) { console.error('Error fetching kardex:', error); setErrorMsg(error.message); }"
);

// Display error in UI
content = content.replace(
  "No hay movimientos registrados para este repuesto.</div>",
  "No hay movimientos registrados para este repuesto. {errorMsg && <p className='text-red-500 mt-2'>Error DB: {errorMsg}</p>}</div>"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched modal to show error');
