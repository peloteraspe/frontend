'use client'; // 1) Este archivo corre en el cliente (usa hooks de React).

import { useEffect, useRef, useState, useCallback } from 'react';

// 2) Opciones del hook (todas opcionales para máxima flexibilidad)
interface UseFetchOpts<T> {
  options?: RequestInit; // 3) Config de fetch: method, headers, body, etc.
  deps?: any[]; // 4) Dependencias externas que re-disparan el fetch (además de url/options)
  immediate?: boolean; // 5) Si debe disparar al montar o no (default true)
  transform?: (res: Response) => Promise<T>; // 6) Parser/transformador (json/text/blob/custom)
  keepPreviousData?: boolean; // 7) Mantener la data anterior mientras carga la nueva
}

// 8) Resultado tipado que devuelve el hook
interface UseFetchResult<T> {
  data: T | null; // 9) Data ya parseada (o null si no hay)
  error: Error | null; // 10) Error (o null si no hay)
  loading: boolean; // 11) Bandera de carga
  refetch: () => Promise<void>; // 12) Función pública para re-disparar manualmente
}

/**
 * 13) Hook genérico para hacer fetch en cliente con cancelación, deps, parser y race-guard.
 * - url?: si no hay URL, no hace nada (útil para condicionar la ejecución)
 * - opts?: ver UseFetchOpts; pensado para UI interactiva (búsquedas, formularios, etc.)
 */
export function useFetch<T = any>(
  url?: string,
  {
    options,
    deps = [],
    immediate = true,
    transform,
    keepPreviousData = false,
  }: UseFetchOpts<T> = {}
): UseFetchResult<T> {
  // 14) Estado base del hook
  const [data, setData] = useState<T | null>(null); // 15) Resultado parseado
  const [error, setError] = useState<Error | null>(null); // 16) Error normalizado
  const [loading, setLoading] = useState(Boolean(immediate)); // 17) loading arranca según immediate

  // 18) Refs para control avanzado:
  const controllerRef = useRef<AbortController | null>(null); // 19) AbortController actual (para cancelar)
  const reqIdRef = useRef(0); // 20) ID incremental de requests (race-guard)

  // 21) Función real que ejecuta el fetch; memoizada para estabilidad entre renders
  const doFetch = useCallback(async () => {
    // 22) Si no hay url, no hacemos nada (evita llamadas accidentales)
    if (!url) return;

    // 23) Cancela cualquier request anterior aún en vuelo
    controllerRef.current?.abort();

    // 24) Prepara nuevo AbortController y aumenta el ID de request
    const controller = new AbortController();
    controllerRef.current = controller;
    const myId = ++reqIdRef.current;

    // 25) Estado de arranque: loading on, error clear; data opcionalmente se mantiene
    setLoading(true);
    setError(null);
    if (!keepPreviousData) setData(null);

    try {
      // 26) Ejecuta fetch con señal de cancelación y las options provistas
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });

      // 27) Si no es OK (no 2xx), lanza error con código (manejable aguas arriba)
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 28) Parser/transform configurable; por defecto asumimos JSON
      const parsed = transform ? await transform(res) : ((await res.json()) as T);

      // 29) Race-guard: si este no es el request vigente, ignorar resultado
      if (myId !== reqIdRef.current) return;

      // 30) Persistir data y apagar loading
      setData(parsed);
      setLoading(false);
    } catch (e: any) {
      // 31) Cancelación no se reporta como error de UI
      if (e?.name === 'AbortError') return;

      // 32) Race-guard para errores: sólo si es el request vigente
      if (myId !== reqIdRef.current) return;

      // 33) Normalizar a Error nativo y apagar loading
      setError(e instanceof Error ? e : new Error(String(e)));
      setLoading(false);
    }
  }, [url, options, transform, keepPreviousData]); // 34) Dependencias internas del callback

  // 35) Efecto: auto-disparo si immediate=true; se limpia abortando
  useEffect(() => {
    if (!immediate) return; // 36) Permite tener el hook inactivo hasta que tú decidas
    doFetch(); // 37) Dispara la petición
    return () => controllerRef.current?.abort(); // 38) Limpieza: cancela en unmount/cambio de deps
    // 39) Deps "externas" controladas por el consumidor + doFetch estable
  }, [doFetch, immediate, ...deps]);

  // 40) Refetch público para reintentar o refrescar manualmente
  const refetch = useCallback(() => doFetch(), [doFetch]);

  // 41) Resultado del hook (as const para mejor inferencia)
  return { data, error, loading, refetch } as const;
}
