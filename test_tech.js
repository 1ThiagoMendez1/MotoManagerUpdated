const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/(^'|'$|^"|"$)/g, '');
  }
});
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase.from('organization_members')
    .select('role, profiles ( id, first_name, last_name, avatar_path )')
    .eq('organization_id', 'ec9ce390-91bf-4ecf-a893-00d39e2ebe34');
  
  if (!data) return [];
  const res = data.map((m) => ({
    id: m.profiles?.id,
    name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim() || 'Técnico',
    specialty: m.role,
    avatarUrl: m.profiles?.avatar_path
  })).filter(t => t.id && (t.specialty === 'mechanic' || t.specialty === 'Técnico'));
  console.log(res);
}

test();
