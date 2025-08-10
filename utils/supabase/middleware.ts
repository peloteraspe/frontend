import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export const createClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const cookieDomain = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN || undefined

  // Create an unmodified response that we'll mutate with cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl as string,
    supabaseAnonKey as string,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: options?.path ?? '/',
            secure: options?.secure ?? true,
            httpOnly: options?.httpOnly ?? true,
            sameSite: (options?.sameSite as any) ?? 'lax',
            expires: options?.expires,
            maxAge: options?.maxAge,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: options?.path ?? '/',
            secure: options?.secure ?? true,
            httpOnly: options?.httpOnly ?? true,
            sameSite: (options?.sameSite as any) ?? 'lax',
            expires: new Date(0),
          })
        },
      },
    }
  )

  return { supabase, response }
}