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
  

  // Forzar cambio de contraseña si es requerido
  if (user && user.user_metadata?.needs_password_change === true) {
    const isChangePasswordRoute = request.nextUrl.pathname === '/change-password';
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    
    if (!isChangePasswordRoute && !isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/change-password';
      return NextResponse.redirect(url);
    }
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Proteger la ruta de admin
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const isSuperAdmin = user.user_metadata?.is_super_admin === true;
    const isAllowedEmail = 
      user.email?.toLowerCase() === 'juanurian31@gmail.com' || 
      user.email?.toLowerCase() === 'mivraadmin@motomanager.com.co';

    if (!isSuperAdmin && !isAllowedEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
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
