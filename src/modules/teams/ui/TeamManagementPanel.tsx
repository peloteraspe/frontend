'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { PublicTeamMember, TeamMemberRole, TeamSummaryRow } from '@modules/teams/model/types';
import { normalizeTeamSocialHandle } from '@modules/teams/lib/socialHandle';

type Props = {
  team: TeamSummaryRow;
  members: PublicTeamMember[];
  viewerRole: TeamMemberRole;
  isFeatured: boolean;
};

export default function TeamManagementPanel({ team, members, viewerRole, isFeatured }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [socialErrors, setSocialErrors] = useState<{
    instagramUsername?: string;
    tiktokUsername?: string;
  }>({});

  async function run(action: string, payload: Record<string, unknown> | FormData = {}, message?: string) {
    setBusy(action);
    setError(null);
    setSuccess(null);
    try {
      const isFormData = payload instanceof FormData;
      if (isFormData) payload.set('action', action);
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'POST',
        ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
        body: isFormData ? payload : JSON.stringify({ action, ...payload }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'No se pudo completar la acción.');
      if (message) setSuccess(message);
      if (action === 'delete' || action === 'leave') {
        window.location.assign('/profile#mis-equipos');
        return;
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl border border-mulberry/15 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">Tu equipo</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Administración</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run(isFeatured ? 'clear-feature' : 'feature', {}, isFeatured ? 'Equipo destacado retirado.' : 'Equipo destacado actualizado.')}
            className="rounded-xl border border-mulberry/25 px-3 py-2 text-xs font-semibold text-mulberry hover:bg-mulberry/5 disabled:opacity-50"
          >
            {isFeatured ? 'Quitar destacado' : 'Destacar equipo'}
          </button>
          <button
            type="button"
            aria-label="¿Qué significa destacar este equipo?"
            aria-describedby="featured-team-action-tooltip"
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mulberry/70 transition-colors hover:bg-mulberry/5 hover:text-mulberry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mulberry/30"
          >
            <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
            <span
              id="featured-team-action-tooltip"
              role="tooltip"
              className="pointer-events-none invisible absolute right-0 top-10 z-30 w-56 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-4 text-white opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
            >
              Al destacarlo, será tu equipo principal y aparecerá en tu cuenta y navegación.
            </span>
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      {viewerRole === 'captain' ? (
        <>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const instagramUsername = normalizeTeamSocialHandle(form.get('instagramUsername'));
              const tiktokUsername = normalizeTeamSocialHandle(form.get('tiktokUsername'));
              const nextSocialErrors = {
                ...(!instagramUsername.ok
                  ? { instagramUsername: instagramUsername.error }
                  : {}),
                ...(!tiktokUsername.ok ? { tiktokUsername: tiktokUsername.error } : {}),
              };
              setSocialErrors(nextSocialErrors);
              if (!instagramUsername.ok || !tiktokUsername.ok) return;

              form.set('instagramUsername', instagramUsername.value || '');
              form.set('tiktokUsername', tiktokUsername.value || '');
              void run('update', form, 'Datos del equipo guardados.');
            }}
          >
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Nombre
              <input name="name" required minLength={2} maxLength={80} defaultValue={team.name} className="peloteras-form-control h-10 px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Escudo o foto (JPG/PNG, máximo 300 KB)
              <input name="avatar" type="file" accept="image/jpeg,image/png" className="peloteras-form-control h-11 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Instagram
                <input
                  name="instagramUsername"
                  defaultValue={team.instagram_username || ''}
                  placeholder="@micuenta o micuenta"
                  onChange={() => {
                    if (socialErrors.instagramUsername) {
                      setSocialErrors((current) => ({ ...current, instagramUsername: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(socialErrors.instagramUsername)}
                  aria-describedby={socialErrors.instagramUsername ? 'team-admin-instagram-error' : undefined}
                  className={`peloteras-form-control h-10 px-3 text-sm ${
                    socialErrors.instagramUsername ? 'peloteras-form-control--error' : ''
                  }`}
                />
                {socialErrors.instagramUsername ? (
                  <span id="team-admin-instagram-error" role="alert" className="font-normal text-red-600">
                    {socialErrors.instagramUsername}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                TikTok
                <input
                  name="tiktokUsername"
                  defaultValue={team.tiktok_username || ''}
                  placeholder="@micuenta o micuenta"
                  onChange={() => {
                    if (socialErrors.tiktokUsername) {
                      setSocialErrors((current) => ({ ...current, tiktokUsername: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(socialErrors.tiktokUsername)}
                  aria-describedby={socialErrors.tiktokUsername ? 'team-admin-tiktok-error' : undefined}
                  className={`peloteras-form-control h-10 px-3 text-sm ${
                    socialErrors.tiktokUsername ? 'peloteras-form-control--error' : ''
                  }`}
                />
                {socialErrors.tiktokUsername ? (
                  <span id="team-admin-tiktok-error" role="alert" className="font-normal text-red-600">
                    {socialErrors.tiktokUsername}
                  </span>
                ) : null}
              </label>
            </div>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Límite de integrantes
              <input
                name="maxMembers"
                type="number"
                required
                min={members.length}
                max={100}
                step={1}
                defaultValue={team.max_members || Math.max(20, members.length)}
                className="peloteras-form-control h-10 px-3 text-sm"
              />
              <span className="font-normal text-slate-500">Plantel actual: {members.length}. Máximo permitido: 100.</span>
            </label>
            <button disabled={busy !== null} className="h-10 rounded-xl bg-mulberry px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy === 'update' ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Gestión del plantel</h3>
            <p className="mt-1 text-xs text-slate-500">{members.length} de {team.max_members} lugares ocupados.</p>
            <div className="mt-3 space-y-2">
              {members.filter((member) => member.role !== 'captain').map((member, index) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-800">{member.username ? `@${member.username}` : `Jugadora ${index + 1}`}</span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (window.confirm('¿Transferir la capitanía a esta jugadora?')) void run('transfer-captain', { memberId: member.id });
                      }}
                      className="rounded-lg border border-mulberry/25 px-2.5 py-1.5 text-xs font-semibold text-mulberry disabled:opacity-50"
                    >
                      Hacer capitana
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (window.confirm('¿Retirar a esta jugadora del equipo?')) void run('remove-member', { memberId: member.id });
                      }}
                      className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                    >
                      Retirar
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (window.confirm('¿Eliminar este equipo? Se ocultará su perfil y se conservará el historial.')) void run('delete');
              }}
              className="text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              Eliminar equipo
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (window.confirm('¿Salir de este equipo?')) void run('leave');
          }}
          className="mt-5 w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
        >
          Salir del equipo
        </button>
      )}
    </section>
  );
}
