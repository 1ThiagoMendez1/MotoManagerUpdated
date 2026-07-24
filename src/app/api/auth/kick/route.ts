import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Cerrar sesión en Supabase
  await supabase.auth.signOut()

  // Eliminar la cookie del device_id
  cookies().delete('device_id')

  // Redirigir al login con el mensaje de que la sesión expiró por otro inicio de sesión
  const requestUrl = new URL(request.url)
  const loginUrl = new URL('/login?kicked=true', requestUrl.origin)
  
  return NextResponse.redirect(loginUrl)
}
