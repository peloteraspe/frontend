export function backendUrl(path: string) {
  const base = process.env.BACKEND_URL;
  if (!base) throw new Error('BACKEND_URL is not defined');
  return `${base}${path}`;
}

export function isAbortError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { name?: string };
  return maybe.name === 'AbortError';
}

export async function fetchWithTimeout(input: string, init?: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, {
      ...init,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }
}

export async function backendFetch(input: string, init?: RequestInit, ms = 8000) {
  return fetchWithTimeout(
    input,
    {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    },
    ms
  );
}

export async function backendJson<T>(path: string, init?: RequestInit, ms = 8000): Promise<T> {
  const res = await backendFetch(backendUrl(path), init, ms);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
