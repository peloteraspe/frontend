import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export const createClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Create an unmodified response
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
          // Note: Setting cookies on request won't work, but keeping for compatibility
          request.cookies.set({
            name,
            value,
            domain: ".peloteras.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "lax", // Changed from "Lax" to "lax"
            ...options,
          })
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          response.cookies.set({
            name,
            value,
            domain: ".peloteras.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "lax", // Changed from "Lax" to "lax"
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Note: Setting cookies on request won't work, but keeping for compatibility
          request.cookies.set({
            name,
            value: '',
            domain: ".peloteras.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "lax", // Changed from "Lax" to "lax"
            expires: new Date(0),
            ...options,
          })
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          response.cookies.set({
            name,
            value: '',
            domain: ".peloteras.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "lax", // Changed from "Lax" to "lax"
            expires: new Date(0),
            ...options,
          })
        },
      },
    }
  )

  return { supabase, response }
}