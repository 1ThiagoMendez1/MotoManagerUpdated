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

async function fixNames() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get all auth users
  const { data: authData } = await supabase.auth.admin.listUsers();
  if (!authData || !authData.users) return;

  for (const user of authData.users) {
    let rawMeta = user.user_metadata || {};
    let firstName = rawMeta.first_name || '';
    let lastName = rawMeta.last_name || '';

    // If missing first_name but has full_name, extract it
    if (!firstName && rawMeta.full_name) {
      const parts = rawMeta.full_name.trim().split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    if (firstName || lastName) {
      // Update profile
      await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName
      }).eq('id', user.id);
      
      // Update auth meta too
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...rawMeta,
          first_name: firstName,
          last_name: lastName
        }
      });
    }
  }
  console.log("Fixed names for", authData.users.length, "users.");
}

fixNames();
