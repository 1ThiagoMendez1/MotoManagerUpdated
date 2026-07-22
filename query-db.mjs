import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmvnbolaowazqyzmkccv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtdm5ib2xhb3dhenF5em1rY2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwOTI1MSwiZXhwIjoyMDk5MTg1MjUxfQ.KCYDD4UShe79LAdNA9fvnCnpCRHEw0NFfPM89wpN3n0';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function cleanOrphanUsers() {
  console.log('\n🧹 ===== LIMPIEZA DE USUARIOS HUÉRFANOS =====\n');

  // Get all auth users
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) { console.error('Error listando users:', error); return; }

  // Get all members with a workshop
  const { data: members } = await supabaseAdmin.from('workshop_members').select('user_id');
  const usersWithWorkshop = new Set((members || []).map(m => m.user_id));

  // Get super admins
  const { data: superAdmins } = await supabaseAdmin.from('user_profiles').select('id').eq('is_super_admin', true);
  const superAdminIds = new Set((superAdmins || []).map(p => p.id));

  // Find orphans: auth users without a workshop and not super admin
  const orphans = users.filter(u => !usersWithWorkshop.has(u.id) && !superAdminIds.has(u.id));

  console.log(`📋 Total usuarios en auth: ${users.length}`);
  console.log(`✅ Usuarios con taller: ${usersWithWorkshop.size}`);
  console.log(`🔑 Super admins: ${superAdminIds.size}`);
  console.log(`🗑️  Usuarios huérfanos a eliminar: ${orphans.length}`);
  console.log('\nHuérfanos encontrados:');
  orphans.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  if (orphans.length === 0) {
    console.log('\n✨ No hay usuarios huérfanos. La base de datos está limpia.');
    return;
  }

  console.log('\n🗑️  Eliminando usuarios huérfanos de auth.users...');
  let deleted = 0;
  let failed = 0;
  for (const user of orphans) {
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error(`  ❌ Fallo al eliminar ${user.email}: ${delError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Eliminado: ${user.email}`);
      deleted++;
    }
  }

  console.log(`\n✅ Limpieza completada: ${deleted} eliminados, ${failed} fallidos`);
  console.log('🚀 Ahora puedes registrar talleres con cualquiera de esos correos.\n');
}

cleanOrphanUsers().catch(console.error);
