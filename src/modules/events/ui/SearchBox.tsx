'use client';
import { useState, useEffect } from 'react';
import { useDebounce } from '../../../shared/lib/hooks/useDebounce';

export function SearchBox() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 400);

  useEffect(() => {
    if (!debouncedQ) return;
    // fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
  }, [debouncedQ]);

  return (
    <input
      value={q} // 8) Controlado: refleja el estado `q`.
      onChange={(e) => setQ(e.target.value)} // 9) Actualiza `q` al escribir; `debouncedQ` se actualizará luego del delay.
      placeholder="Buscar eventos…"
      aria-label="Buscar" // 10) A11y: nombre accesible para lectores de pantalla.
      className="input"
    />
  );
}
