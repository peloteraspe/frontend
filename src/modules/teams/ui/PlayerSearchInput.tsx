'use client';

import { CheckIcon, ClockIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import type {
  TeamInvitationCandidate,
  TeamInvitationSelection,
} from '@modules/teams/model/types';
import { useDebounce } from '../../../shared/lib/hooks/useDebounce';

interface Props {
  teamId: number;
  onSelect: (selection: TeamInvitationSelection) => void;
  selected: TeamInvitationSelection | null;
  placeholder?: string;
  minChars?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PlayerSearchInput({
  teamId,
  onSelect,
  selected,
  placeholder = 'Buscar por @username o email…',
  minChars = 2,
}: Props) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 350);
  const [results, setResults] = useState<TeamInvitationCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  // ids ya elegidos para filtrar resultados
  const selectedIds = useMemo(
    () =>
      new Set(
        selected?.kind === 'player' ? [selected.candidate.id] : []
      ),
    [selected]
  );
  const normalizedEmail = q.trim().toLowerCase();
  const canInviteByEmail =
    !loading &&
    results.length === 0 &&
    normalizedEmail.length <= 254 &&
    EMAIL_PATTERN.test(normalizedEmail);

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
        const params = new URLSearchParams({
          q: term,
          team_id: String(teamId),
        });
        const res = await fetch(`/api/players/search?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Search failed');
        const json = (await res.json()) as { data: TeamInvitationCandidate[] };
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
  }, [debouncedQ, minChars, selectedIds, teamId]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-stone-700 mb-1">Convocar jugadora</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="peloteras-form-control h-11 px-3"
        aria-label="Buscar jugadoras por username o email"
      />

      {/* suggestions */}
      {q.trim().length >= minChars && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.35)]">
          {loading && <div className="p-3 text-sm text-stone-500">Buscando…</div>}
          {!loading && results.length === 0 && !canInviteByEmail && (
            <div className="p-3 text-sm text-stone-500">Sin resultados</div>
          )}
          {canInviteByEmail ? (
            <button
              type="button"
              onClick={() => {
                onSelect({ kind: 'email', email: normalizedEmail });
                setQ('');
              }}
              className="group flex min-h-[4.25rem] w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-mulberry/[0.035] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-mulberry/15"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mulberry/10 bg-mulberry/10 text-mulberry">
                <UserPlusIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {normalizedEmail}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Puede crear su cuenta después de recibir el correo
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-mulberry/10 bg-mulberry/[0.07] px-2.5 py-1.5 text-xs font-semibold text-mulberry transition group-hover:bg-mulberry group-hover:text-white">
                Convocar
              </span>
            </button>
          ) : null}
          {!loading &&
            results.map((p) => {
              const canInvite = p.status === 'available';
              const statusLabel =
                p.status === 'member'
                  ? 'Ya es integrante'
                  : p.status === 'pending'
                    ? 'Convocatoria pendiente'
                    : 'Convocar';

              return (
              <button
                key={p.id}
                type="button"
                disabled={!canInvite}
                onClick={() => {
                  onSelect({ kind: 'player', candidate: p });
                  setQ(''); // limpia el input después de elegir
                }}
                className="group flex min-h-[4.25rem] w-full items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-mulberry/[0.035] focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-mulberry/15 disabled:cursor-not-allowed disabled:bg-slate-50/70"
              >
                {p.avatarUrl ? (
                  <img
                    alt=""
                    src={p.avatarUrl}
                    className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-sm"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mulberry/10 bg-mulberry/10 text-sm font-bold uppercase text-mulberry">
                    {p.username.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">@{p.username}</div>
                  {p.displayName ? (
                    <div className="mt-0.5 truncate text-xs text-slate-500">{p.displayName}</div>
                  ) : null}
                </div>
                <span
                  className={
                    canInvite
                      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-mulberry/10 bg-mulberry/[0.07] px-2.5 py-1.5 text-xs font-semibold text-mulberry transition group-hover:border-mulberry/20 group-hover:bg-mulberry group-hover:text-white'
                      : 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500'
                  }
                >
                  {canInvite ? (
                    <UserPlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : p.status === 'pending' ? (
                    <ClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{statusLabel}</span>
                  <span className="sm:hidden">{canInvite ? 'Convocar' : p.status === 'pending' ? 'Pendiente' : 'En equipo'}</span>
                </span>
              </button>
              );
            })}
        </div>
      )}

      {/* chips seleccionados (opcional mostrar aquí) */}
      {selected ? (
        <div className="mt-3" aria-live="polite">
          <div className="flex items-center gap-3 rounded-2xl border border-mulberry/15 bg-mulberry/[0.045] px-3.5 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mulberry text-white shadow-sm">
              <CheckIcon aria-hidden="true" className="h-4 w-4 stroke-2" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">Lista para convocar</span>
              <span className="block truncate text-sm font-semibold text-slate-900">
                {selected.kind === 'player'
                  ? `@${selected.candidate.username}`
                  : selected.email}
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
