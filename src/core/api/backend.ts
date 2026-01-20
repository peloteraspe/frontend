export function backendUrl(path: string) {
  const base = process.env.BACKEND_URL;
  if (!base) throw new Error('BACKEND_URL is not defined');
  return `${base}${path}`;
}

export async function backendFetch(input: string, init?: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, {
      ...init,
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } finally {
    clearTimeout(to);
  }
}
