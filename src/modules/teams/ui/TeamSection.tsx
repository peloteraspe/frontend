// src/modules/teams/ui/TeamSection.tsx
'use client';
import { useState } from 'react';
import TeamCreateModal from './TeamCreateModal';

export default function TeamSection({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-900">Mi equipo</h3>
          <p className="mt-1 text-sm text-slate-600">
            Arma tu equipo para invitar jugadoras y organizar partidos más rápido.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <div>
              <p className="text-sm font-medium text-slate-800">Aún no cuentas con un equipo.</p>
              <p className="text-xs text-slate-500">Crea uno y empieza a invitar jugadoras.</p>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-btnBg-light px-4 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-btnBg-dark hover:shadow"
          >
            Crear equipo
          </button>
        </div>
      </div>

      <TeamCreateModal open={open} onClose={() => setOpen(false)} currentUserId={currentUserId} />
    </>
  );
}
