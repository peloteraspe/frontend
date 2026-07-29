import { CheckCircleIcon, LinkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { TeamInvitationLinkPreview } from '@modules/teams/model/types';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';

type Props = {
  preview: TeamInvitationLinkPreview | null;
  mode: 'login_required' | 'already_member' | 'invalid';
  loginHref?: string;
  signupHref?: string;
};

export default function TeamGeneralInvitationPage({
  preview,
  mode,
  loginHref = '/login',
  signupHref = '/signUp',
}: Props) {
  if (mode === 'invalid' || !preview) {
    return (
      <main className="site-shell grid min-h-[65vh] w-full place-items-center py-10">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <LinkIcon aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Este enlace ya no está disponible</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Puede haber sido regenerado o el equipo ya no está activo.</p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell grid min-h-[65vh] w-full place-items-center py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-white bg-white shadow-[0_20px_60px_rgba(84,8,111,0.14)]">
        <div className="h-24 bg-[linear-gradient(125deg,#54086F_0%,#7B2A91_58%,#F0815B_145%)]" />
        <div className="px-6 pb-8 text-center sm:px-9">
          <span className="mx-auto -mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#F7F1F9] text-2xl font-bold text-mulberry shadow-md">
            {preview.teamAvatarUrl ? (
              <img src={preview.teamAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              preview.teamName.slice(0, 1)
            )}
          </span>
          <p className="mt-5 text-sm font-semibold text-mulberry">@{preview.teamSlug}</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">{preview.teamName} te invita a su equipo</h1>

          {mode === 'already_member' ? (
            <>
              <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                <CheckCircleIcon aria-hidden="true" className="h-5 w-5" />
                Ya formas parte de este equipo.
              </div>
              <Link href={buildPublicTeamPath(preview.teamSlug)} className="mt-6 inline-flex h-11 items-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white">Ver equipo</Link>
            </>
          ) : (
            <>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">Debes iniciar sesión o crear una cuenta para responder esta convocatoria. No te incorporaremos automáticamente.</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={loginHref} className="inline-flex h-11 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white">Iniciar sesión</Link>
                <Link href={signupHref} className="inline-flex h-11 items-center justify-center rounded-xl border border-mulberry/20 px-5 text-sm font-semibold text-mulberry">Crear cuenta</Link>
              </div>
              <Link href={buildPublicTeamPath(preview.teamSlug)} className="mt-5 inline-block text-sm font-semibold text-slate-600 hover:text-mulberry">Ver perfil del equipo</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
