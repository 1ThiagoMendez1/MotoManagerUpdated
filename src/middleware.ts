import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSuperAdmin } from '@/lib/super-admin'
import { internalSupabaseFetch } from '@/lib/supabase/transport'
import { isTrialReviewRequestAllowed, TRIAL_REVIEW_PATH } from '@/lib/trial-review'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Public visits without a session do not need an Auth network round trip.
  const protectedPaths = ['/dashboard', '/inventory', '/work-orders', '/admin', '/sales', '/customers', '/motorcycles', '/appointments', '/team', '/settings', '/accounting', '/services', '/technicians', '/tickets'];
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));
  const hasSession = request.cookies.getAll().some(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));
  const authorization = request.headers.get('authorization') || '';
  const bearerToken = /^Bearer [A-Za-z0-9._~-]+$/i.test(authorization) && authorization.length <= 8192 ? authorization.slice(7) : undefined;
  if (!hasSession && !bearerToken && !isProtectedRoute) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: internalSupabaseFetch(), ...(bearerToken ? { headers: { Authorization: 'Bearer ' + bearerToken } } : {}) },
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
  const { data: { user } } = await supabase.auth.getUser(bearerToken)

  const withSessionCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };

  if (user && !isSuperAdmin(user)) {
    const { data: review, error } = await supabase.rpc('get_my_trial_review');
    if (error) {
      return withSessionCookies(NextResponse.json({ error: 'No se pudo verificar el acceso. Intenta de nuevo.' }, { status: 503 }));
    }
    if (review) {
      const allowed = isTrialReviewRequestAllowed(request.nextUrl.pathname, request.method, request.headers.has('next-action'));
      if (!allowed) {
        if (request.nextUrl.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
          return withSessionCookies(NextResponse.json({ code: 'TRIAL_UNDER_REVIEW', error: review.message, redirect: TRIAL_REVIEW_PATH }, { status: 403 }));
        }
        const url = request.nextUrl.clone();
        url.pathname = TRIAL_REVIEW_PATH;
        url.search = '';
        return withSessionCookies(NextResponse.redirect(url));
      }
      return supabaseResponse;
    }
  }

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
