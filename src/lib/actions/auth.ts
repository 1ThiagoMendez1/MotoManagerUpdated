'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor, ingresa correo y contraseña.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error);
    return { error: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
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
