import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fmvnbolaowazqyzmkccv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtdm5ib2xhb3dhenF5em1rY2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwOTI1MSwiZXhwIjoyMDk5MTg1MjUxfQ.KCYDD4UShe79LAdNA9fvnCnpCRHEw0NFfPM89wpN3n0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Creando usuario Super Admin...');
  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email: 'admin@motomanager.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Super Admin' }
  });

  if (adminError) {
    console.error('Error al crear Super Admin:', adminError);
  } else {
    console.log('Super Admin creado con ID:', adminData.user.id);
    
    // Set as super admin
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_super_admin: true })
      .eq('id', adminData.user.id);
      
    if (updateError) {
      console.error('Error al actualizar is_super_admin:', updateError);
    } else {
      console.log('✅ Super Admin configurado correctamente (admin@motomanager.com / password123)');
    }
  }

  console.log('\nCreando usuario Taller/Cliente...');
  const { data: tallerData, error: tallerError } = await supabase.auth.admin.createUser({
    email: 'taller@motomanager.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Dueño de Taller' }
  });

  if (tallerError) {
    console.error('Error al crear Taller:', tallerError);
  } else {
    console.log('✅ Usuario Taller creado correctamente (taller@motomanager.com / password123)');
  }
}

main().catch(console.error);
