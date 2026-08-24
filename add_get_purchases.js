const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newFunc = `
export const getPurchases = async (organizationId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }
  return data || [];
};
`;

content += newFunc;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Added getPurchases');
