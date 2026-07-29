'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getWorkshopDetails } from '@/lib/auth-server';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor, ingresa correo y contraseña.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error);
    return { error: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message };
  }

  const user = data?.user;
  
  if (user) {
    const deviceId = crypto.randomUUID();
    
    await supabase.auth.updateUser({
      data: { active_device_id: deviceId }
    });

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('device_id', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  }

  revalidatePath('/', 'layout');
  
  if (user?.user_metadata?.needs_password_change === true) {
    redirect('/change-password');
  }

  const isSuperAdmin = user?.user_metadata?.is_super_admin === true || user?.email?.startsWith('admin@') || user?.email?.toLowerCase() === 'juanurian31@gmail.com';

  if (isSuperAdmin) {
    redirect('/admin');
  } else {
    const workshop = await getWorkshopDetails(user);
    if (workshop?.slug) {
      redirect(`/${workshop.slug}`);
    } else {
      console.warn(`[loginAction] No workshop slug found for user ${user.email}, redirecting to /no-workshop`);
      redirect('/no-workshop');
    }
  }
}

export async function registerWorkshopAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const workshopName = formData.get('workshopName') as string;

  if (!email || !password || !firstName || !lastName || !workshopName) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const supabase = await createClient();

  // 1. Sign Up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return { error: signUpError.message };
  }

  if (!signUpData.user) {
    return { error: 'No se pudo crear el usuario.' };
  }

  // 2. We must create the organization using the RPC. 
  // However, `supabase.auth.signUp` might not immediately set the session cookie for the server-side client if email confirmation is required.
  // Assuming email confirmations are disabled for this flow or handled gracefully.
  
  // Since we are logged in now (assuming no email confirmation), we call the RPC.
  const slug = workshopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_organization_with_owner', {
    org_name: workshopName,
    org_slug: slug
  });

  if (rpcError) {
    console.error('RPC Error creating organization:', rpcError);
    // Even if it fails, the user is created. They might be stranded without an org. 
    return { error: 'Se creó el usuario pero hubo un error creando el taller: ' + rpcError.message };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function changePasswordAction(formData: FormData) {
  const newPassword = formData.get('newPassword') as string;
  
  if (!newPassword || newPassword.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'No estás autenticado.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { needs_password_change: false }
  });

  if (error) {
    console.error('Change password error:', error);
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  const workshop = await getWorkshopDetails();
  if (workshop?.slug) {
    redirect(`/${workshop.slug}`);
  } else {
    redirect('/no-workshop');
  }
}
