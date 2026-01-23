import { useEffect, useState } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Hook genérico para hacer fetch.
 * @param url - string con la URL a consultar.
 * @param options - opciones opcionales del fetch (método, headers, body, etc).
 */
export function useFetch<T = any>(url?: string, options?: RequestInit): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url, { ...options, signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        setData(json);
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
          setError(err as Error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [url]);

  return { data, error, loading };
}
