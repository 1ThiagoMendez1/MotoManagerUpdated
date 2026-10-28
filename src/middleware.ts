import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSuperAdmin } from '@/lib/super-admin'
import { internalSupabaseFetch } from '@/lib/supabase/transport'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Public visits without a session do not need an Auth network round trip.
  const protectedPaths = ['/dashboard', '/inventory', '/work-orders', '/admin', '/sales', '/customers', '/motorcycles', '/appointments', '/team', '/settings', '/accounting', '/services', '/technicians', '/tickets'];
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));
  const hasSession = request.cookies.getAll().some(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));
  if (!hasSession && !isProtectedRoute) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: internalSupabaseFetch() },
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
  // Forzar cambio de contraseña si es requerido
  if (user && user.user_metadata?.needs_password_change === true) {
    const isChangePasswordRoute = request.nextUrl.pathname === '/change-password';
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname === '/auth/callback';
    
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
    if (!isSuperAdmin(user)) {
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
