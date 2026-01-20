// src/modules/teams/ui/TeamSection.tsx
'use client';
import { useState } from 'react';
import TeamCreateModal from './TeamCreateModal';

export default function TeamSection({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
            <span className="text-gray-500 text-sm">👥</span>
          </div>
          <p className="text-sm text-gray-700">Aún no cuentas con un equipo.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl uppercase"
        >
          <span className="text-sm font-semibold">Crear equipo</span>
        </button>
      </div>

      <TeamCreateModal open={open} onClose={() => setOpen(false)} currentUserId={currentUserId} />
    </>
  );
}
