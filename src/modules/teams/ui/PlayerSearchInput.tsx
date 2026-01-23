'use client';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '../../../shared/lib/hooks/useDebounce';

type Player = { id: string; name: string; email: string; avatar?: string | null };

interface Props {
  onSelect: (player: Player) => void;
  selected: Player[];
  placeholder?: string;
  minChars?: number;
}

export default function PlayerSearchInput({
  onSelect,
  selected,
  placeholder = 'Buscar por nombre o email…',
  minChars = 2,
}: Props) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 350);
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  // ids ya elegidos para filtrar resultados
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  useEffect(() => {
    let canceled = false;
    const go = async () => {
      const term = debouncedQ.trim();
      if (term.length < minChars) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(term)}&limit=10`);
        if (!res.ok) throw new Error('Search failed');
        const json = (await res.json()) as { data: Player[] };
        if (!canceled) setResults(json.data.filter((p) => !selectedIds.has(p.id)));
      } catch (e) {
        if (!canceled) setResults([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    go();
    return () => {
      canceled = true;
    };
  }, [debouncedQ, minChars, selectedIds]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-stone-700 mb-1">Añadir jugadora</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:ring-2 focus:ring-stone-400"
        aria-label="Buscar jugadoras por nombre o email"
      />

      {/* suggestions */}
      {q.trim().length >= minChars && (
        <div className="mt-2 rounded-xl border border-stone-200 bg-white shadow-sm">
          {loading && <div className="p-3 text-sm text-stone-500">Buscando…</div>}
          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-stone-500">Sin resultados</div>
          )}
          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setQ(''); // limpia el input después de elegir
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-3"
              >
                <img
                  alt=""
                  src={p.avatar || '/assets/avatar-placeholder.png'}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-800">{p.name}</div>
                  <div className="text-xs text-stone-500">{p.email}</div>
                </div>
                <span className="text-xs text-stone-600">Agregar</span>
              </button>
            ))}
        </div>
      )}

      {/* chips seleccionados (opcional mostrar aquí) */}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-800"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
