import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión de forma optimista
  const { data: { user } } = await supabase.auth.getUser()

  // Proteger rutas que requieran sesión
  const protectedPaths = ['/dashboard', '/inventory', '/work-orders', '/admin', '/sales', '/customers', '/motorcycles', '/appointments', '/team', '/settings', '/accounting']
  const isProtectedRoute = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  
  // Prevenir sesiones concurrentes
  if (user) {
    const currentDeviceId = request.cookies.get('device_id')?.value;
    const activeDeviceId = user.user_metadata?.active_device_id;
    
    // Si hay un activeDeviceId y no coincide con el de la cookie actual,
    // significa que inició sesión en otro dispositivo.
    if (activeDeviceId && currentDeviceId !== activeDeviceId) {
      const url = request.nextUrl.clone();
      url.pathname = '/api/auth/kick';
      return NextResponse.redirect(url);
    }
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Proteger la ruta de admin solo para juanurian31@gmail.com
  if (user && request.nextUrl.pathname.startsWith('/admin') && user.email?.toLowerCase() !== 'juanurian31@gmail.com') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirigir de login a dashboard si ya está autenticado
  if (user && request.nextUrl.pathname === '/login') {
     const url = request.nextUrl.clone()
     url.pathname = '/dashboard'
     return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
