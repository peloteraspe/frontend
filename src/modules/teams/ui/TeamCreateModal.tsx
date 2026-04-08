// src/modules/teams/ui/TeamCreateModal.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import PlayerSearchInput from './PlayerSearchInput';
import { createBrowserClient } from '@supabase/ssr'; // si no tienes helper, puedes usar el de supabase-js
// Si ya tienes un wrapper `utils/supabase/client`, impórtalo de ahí.

type Player = { id: string; name: string; email: string; avatar?: string | null };

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string; // owner del equipo
}

export default function TeamCreateModal({ open, onClose, currentUserId }: Props) {
  const [teamName, setTeamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // evita scroll de fondo cuando open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const addPlayer = (p: Player) => {
    setSelectedPlayers((prev) => (prev.find((x) => x.id === p.id) ? prev : [...prev, p]));
  };

  const removePlayer = (id: string) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const addInvite = () => {
    const e = inviteEmail.trim();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    setInvites((prev) => (prev.includes(e) ? prev : [...prev, e]));
    setInviteEmail('');
  };

  const canSubmit = useMemo(() => teamName.trim().length >= 3, [teamName]);

  async function uploadTeamImageIfAny(): Promise<string | null> {
    if (!file) return null;
    // Crea un client de supabase para navegador (usa tus NEXT_PUBLIC keys)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const path = `teams/${currentUserId}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('teams').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: publicUrl } = supabase.storage.from('teams').getPublicUrl(path);
    return publicUrl?.publicUrl ?? null;
  }

  async function onSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const imageUrl = await uploadTeamImageIfAny();

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          ownerId: currentUserId,
          memberIds: selectedPlayers.map((p) => p.id),
          invites,
          imageUrl,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear el equipo');
      onClose();
      // opcional: mostrar toast, revalidatePath('/profile') desde acción del server
    } catch (e) {
      console.error(e);
      alert('Error al crear equipo');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* panel */}
      <div className="relative z-[81] w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Crear equipo</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
            ✕
          </button>
        </div>

        {/* Team name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Nombre del equipo</label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="peloteras-form-control h-11 px-3"
            placeholder="Ej. Las Panteras"
          />
        </div>

        {/* Team image */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Foto del equipo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="peloteras-form-control peloteras-form-control--file h-11"
          />
        </div>

        {/* Player search + chips */}
        <div className="mb-4">
          <PlayerSearchInput onSelect={addPlayer} selected={selectedPlayers} />
          {selectedPlayers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => removePlayer(p.id)}
                  className="group inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-800 hover:bg-stone-200"
                  title="Quitar"
                >
                  <img
                    alt=""
                    src={p.avatar || '/assets/avatar-placeholder.png'}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  {p.name}
                  <span className="text-stone-400 group-hover:text-stone-600">✕</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Invite by email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-1">Invitar por email</label>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="peloteras-form-control h-11 flex-1 px-3"
              placeholder="correo@ejemplo.com"
            />
            <button
              type="button"
              onClick={addInvite}
              className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            >
              Agregar
            </button>
          </div>
          {invites.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {invites.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-btnBg-light px-4 py-2 text-sm font-semibold text-white hover:bg-btnBg-dark disabled:opacity-60"
          >
            {submitting ? 'Creando…' : 'Crear equipo'}
          </button>
        </div>
      </div>
    </div>
  );
}
