'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import soccerBall from '@core/assets/soccer-ball.svg';

const COOKIE_SEGMENTS_TO_CLEAR = 6;

function clearClientAuthStorage() {
  try {
    const localKeys = Object.keys(window.localStorage).filter(
      (key) => key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')
    );
    for (const key of localKeys) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }

  try {
    const sessionKeys = Object.keys(window.sessionStorage).filter(
      (key) => key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')
    );
    for (const key of sessionKeys) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

function clearClientAuthCookies() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = (() => {
      try {
        return new URL(url).hostname.split('.')[0] || '';
      } catch {
        return '';
      }
    })();

    const baseNames = ['supabase-auth-token'];
    if (projectRef) {
      baseNames.push(`sb-${projectRef}-auth-token`);
      baseNames.push(`sb-${projectRef}-auth-token-code-verifier`);
    }

    const cookieNames = new Set<string>();
    for (const baseName of baseNames) {
      cookieNames.add(baseName);
      cookieNames.add(`__Secure-${baseName}`);
      cookieNames.add(`__Host-${baseName}`);
      for (let i = 0; i < COOKIE_SEGMENTS_TO_CLEAR; i += 1) {
        cookieNames.add(`${baseName}.${i}`);
        cookieNames.add(`__Secure-${baseName}.${i}`);
        cookieNames.add(`__Host-${baseName}.${i}`);
      }
    }

    const fromDocument = document.cookie
      .split(';')
      .map((cookie) => cookie.split('=')[0]?.trim())
      .filter(Boolean) as string[];
    for (const name of fromDocument) {
      if (name.includes('sb-') || name.includes('supabase') || name.includes('auth-token')) {
        cookieNames.add(name);
      }
    }

    const host = window.location.hostname;
    for (const name of Array.from(cookieNames)) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=${host}`;
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=${host}`;
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=.${host}`;
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=.${host}`;
      }
    }
  } catch {
    // ignore
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        reject(new Error('timeout'));
      }, timeoutMs);
    }),
  ]);
}

export default function LogoutPage() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { getBrowserSupabase } = await import('@core/api/supabase.browser');
        const supabase = getBrowserSupabase();
        await withTimeout(supabase.auth.signOut({ scope: 'local' }), 3500).catch(() => undefined);
        await withTimeout(supabase.auth.signOut(), 3500).catch(() => undefined);
      } catch {
        // ignore
      }

      clearClientAuthStorage();
      clearClientAuthCookies();

      await withTimeout(
        fetch('/auth/signout', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          keepalive: true,
        }),
        6000
      ).catch(() => undefined);

      clearClientAuthStorage();
      clearClientAuthCookies();

      if (!cancelled) {
        window.location.replace('/login?message=session_closed');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="text-center flex flex-col items-center">
        <div className="mb-5 animate-spin">
          <Image src={soccerBall} alt="Cerrando sesion" width={56} height={56} priority />
        </div>
        <p className="text-slate-900 font-semibold">Cerrando sesion…</p>
        <p className="mt-2 text-sm text-slate-600">Limpiando acceso y datos de autenticacion…</p>
      </div>
    </div>
  );
}

