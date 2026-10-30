'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/super-admin';
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

  revalidatePath('/', 'layout');
  
  if (user?.user_metadata?.needs_password_change === true) {
    redirect('/change-password');
  }


  if (isSuperAdmin(user)) {
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

export async function registerWorkshopAction(_formData: FormData) {
  redirect('/prueba-gratis');
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
