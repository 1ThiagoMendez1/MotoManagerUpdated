import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const cookieOptions = {
                            ...options,
                            maxAge: options.maxAge ?? 31536000,
                            path: '/',
                            sameSite: 'lax' as const,
                        };
                        request.cookies.set(name, value)
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        supabaseResponse.cookies.set(name, value, cookieOptions)
                    })
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/api/auth') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/register-workshop') &&
        !request.nextUrl.pathname.startsWith('/debug') &&
        !request.nextUrl.pathname.startsWith('/planes') &&
        !request.nextUrl.pathname.startsWith('/api/wompi') &&
        !request.nextUrl.pathname.startsWith('/cotizacion')
    ) {
        // no user, potentially respond by redirecting the user to the planes page
        const url = request.nextUrl.clone()
        url.pathname = '/planes'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
