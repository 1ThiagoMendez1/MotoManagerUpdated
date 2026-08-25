const str = '{"location":"","supplier":"juanrepuestos"}';
try {
  const parsed = JSON.parse(str);
  console.log('Location:', parsed.location);
  console.log('Supplier:', parsed.supplier);
} catch (e) {
  console.error('Error:', e.message);
}
