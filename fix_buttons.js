const fs = require('fs');
const path = require('path');

function updateButton(filePath, isAdd) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const oldImport = `import { useFormStatus } from 'react-dom';`;
  if (!content.includes('useFormStatus')) {
    content = content.replace(
      `import { useActionState } from 'react';`,
      `import { useActionState } from 'react';\nimport { useFormStatus } from 'react-dom';`
    );
  }

  const oldButtonBlock = isAdd 
    ? `function SubmitButton() {
  return (
    <Button type="submit">
      <PlusCircle className="mr-2 h-4 w-4" />
      Agregar Artículo
    </Button>
  );
}`
    : `function SubmitButton() {
  return (
    <Button type="submit">
      <Edit className="mr-2 h-4 w-4" />
      Actualizar Artículo
    </Button>
  );
}`;

  const newButtonBlock = isAdd
    ? `function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      {pending ? 'Guardando...' : 'Agregar Artículo'}
    </Button>
  );
}`
    : `function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
      {pending ? 'Actualizando...' : 'Actualizar Artículo'}
    </Button>
  );
}`;

  content = content.replace(oldButtonBlock, newButtonBlock);
  fs.writeFileSync(filePath, content, 'utf8');
}

updateButton(path.join(__dirname, 'src/components/forms/AddInventoryItem.tsx'), true);
updateButton(path.join(__dirname, 'src/components/forms/EditInventoryItem.tsx'), false);
console.log('Fixed loading buttons');
