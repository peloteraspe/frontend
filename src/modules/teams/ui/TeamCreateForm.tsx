'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import type { TeamSummaryRow } from '@modules/teams/model/types';
import { trackEvent } from '@shared/lib/analytics';

const MAX_TEAM_NAME_LENGTH = 80;
const MAX_SOCIAL_HANDLE_LENGTH = 30;
const MAX_AVATAR_BYTES = 300 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const SOCIAL_HANDLE_PATTERN = /^[a-zA-Z0-9._]+$/;

type FieldErrors = Partial<{
  name: string;
  avatar: string;
  instagramUsername: string;
  tiktokUsername: string;
  maxMembers: string;
  server: string;
}>;

interface Props {
  onCancel: () => void;
  onCreated?: (team: TeamSummaryRow) => void;
}

function getAvatarExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function validateAvatar(file: File | null) {
  if (!file) return null;

  const extension = getAvatarExtension(file);
  if (!ALLOWED_AVATAR_TYPES.has(file.type) || !ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
    return 'Sube una imagen JPG o PNG.';
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return 'La foto debe pesar 300 KB como máximo.';
  }

  return null;
}

function normalizeSocialHandle(value: string, network: 'instagram' | 'tiktok') {
  const trimmed = value.trim();
  if (!trimmed) return { value: null, error: null };

  let candidate = trimmed.replace(/^@+/, '');

  if (/^https?:\/\//i.test(candidate) || candidate.includes('/')) {
    try {
      const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
      const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
      const allowedHosts =
        network === 'instagram'
          ? new Set(['instagram.com'])
          : new Set(['tiktok.com', 'vm.tiktok.com']);

      if (!allowedHosts.has(hostname)) {
        return {
          value: null,
          error:
            network === 'instagram'
              ? 'Ingresa un usuario o URL válida de Instagram.'
              : 'Ingresa un usuario o URL válida de TikTok.',
        };
      }

      const firstSegment = url.pathname.split('/').filter(Boolean)[0] || '';
      candidate = firstSegment.replace(/^@+/, '');
    } catch {
      return { value: null, error: 'Revisa el formato de la red social.' };
    }
  }

  if (
    !candidate ||
    candidate.length > MAX_SOCIAL_HANDLE_LENGTH ||
    !SOCIAL_HANDLE_PATTERN.test(candidate)
  ) {
    return {
      value: null,
      error: `Usa solo letras, números, punto o guion bajo, hasta ${MAX_SOCIAL_HANDLE_LENGTH} caracteres.`,
    };
  }

  return { value: candidate, error: null };
}

export default function TeamCreateForm({ onCancel, onCreated }: Props) {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [maxMembers, setMaxMembers] = useState('20');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  const teamInitial = teamName.trim().slice(0, 1).toUpperCase() || 'E';

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const name = teamName.trim();

    if (!name) {
      nextErrors.name = 'Ingresa el nombre del equipo.';
    } else if (name.length < 2 || name.length > MAX_TEAM_NAME_LENGTH) {
      nextErrors.name = `El nombre debe tener entre 2 y ${MAX_TEAM_NAME_LENGTH} caracteres.`;
    }

    const avatarError = validateAvatar(file);
    if (avatarError) nextErrors.avatar = avatarError;

    const normalizedInstagram = normalizeSocialHandle(instagramUsername, 'instagram');
    const normalizedTiktok = normalizeSocialHandle(tiktokUsername, 'tiktok');
    const normalizedMaxMembers = Number(maxMembers);
    if (normalizedInstagram.error) nextErrors.instagramUsername = normalizedInstagram.error;
    if (normalizedTiktok.error) nextErrors.tiktokUsername = normalizedTiktok.error;
    if (!Number.isInteger(normalizedMaxMembers) || normalizedMaxMembers < 1 || normalizedMaxMembers > 100) {
      nextErrors.maxMembers = 'El límite debe estar entre 1 y 100 integrantes.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return null;

    return {
      name,
      instagramUsername: normalizedInstagram.value,
      tiktokUsername: normalizedTiktok.value,
      maxMembers: normalizedMaxMembers,
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formValues = validateForm();
    if (!formValues) return;

    setSubmitting(true);
    setErrors({});
    trackEvent('team_create_started', {
      has_avatar: Boolean(file),
      has_instagram: Boolean(formValues.instagramUsername),
      has_tiktok: Boolean(formValues.tiktokUsername),
    });

    let failureTracked = false;

    try {
      const body = new FormData();
      body.set('name', formValues.name);
      idempotencyKeyRef.current =
        idempotencyKeyRef.current ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      body.set('idempotencyKey', idempotencyKeyRef.current);
      body.set('maxMembers', String(formValues.maxMembers));
      if (file) body.set('avatar', file);
      if (formValues.instagramUsername) body.set('instagramUsername', formValues.instagramUsername);
      if (formValues.tiktokUsername) body.set('tiktokUsername', formValues.tiktokUsername);

      const res = await fetch('/api/teams', {
        method: 'POST',
        body,
      });
      const json = (await res.json().catch(() => null)) as
        | { team?: TeamSummaryRow; error?: string }
        | null;

      if (!res.ok || !json?.team) {
        const message = json?.error || 'No se pudo crear el equipo.';
        trackEvent('team_create_failed', {
          status: res.status,
          reason: message,
          has_avatar: Boolean(file),
          has_instagram: Boolean(formValues.instagramUsername),
          has_tiktok: Boolean(formValues.tiktokUsername),
        });
        if (file) {
          trackEvent('team_avatar_upload_failed', {
            status: res.status,
            reason: message,
          });
        }
        failureTracked = true;
        throw new Error(message);
      }

      trackEvent('team_created', {
        team_id: json.team.id,
        team_slug: json.team.slug,
        has_avatar: Boolean(file),
        has_instagram: Boolean(formValues.instagramUsername),
        has_tiktok: Boolean(formValues.tiktokUsername),
      });
      onCreated?.(json.team);
      router.refresh();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear el equipo. Inténtalo nuevamente.';
      if (!failureTracked) {
        trackEvent('team_create_failed', {
          reason: message,
          has_avatar: Boolean(file),
          has_instagram: Boolean(formValues.instagramUsername),
          has_tiktok: Boolean(formValues.tiktokUsername),
        });
      }
      setErrors((currentErrors) => ({ ...currentErrors, server: message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-mulberry hover:text-btnBg-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Volver a mis equipos
        </button>
        <h2 className="text-xl font-semibold text-slate-900">Crear un equipo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Empieza con lo esencial. Luego podrás compartir el perfil del equipo con tu plantel.
        </p>
      </div>

      <div className="space-y-7 p-5 sm:p-6">
        <section aria-labelledby="team-identity-title">
          <div className="mb-4">
            <h3 id="team-identity-title" className="text-sm font-semibold text-slate-900">
              Identidad del equipo
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              El nombre es obligatorio. La foto puede agregarse ahora o más adelante.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-start">
            <div>
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-mulberry/15 bg-mulberry/5 text-2xl font-bold text-mulberry">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Previsualización de la foto del equipo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true">{teamInitial}</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="team-avatar"
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    const avatarError = validateAvatar(nextFile);
                    setFile(avatarError ? null : nextFile);
                    setErrors((currentErrors) => ({
                      ...currentErrors,
                      avatar: avatarError || undefined,
                    }));
                    if (avatarError) {
                      trackEvent('team_avatar_upload_failed', {
                        stage: 'client_validation',
                        reason: avatarError,
                      });
                      event.target.value = '';
                    }
                  }}
                  className="peer sr-only"
                  aria-invalid={Boolean(errors.avatar)}
                  aria-describedby={
                    errors.avatar ? 'team-avatar-help team-avatar-error' : 'team-avatar-help'
                  }
                />
                <label
                  htmlFor="team-avatar"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-mulberry/30 hover:bg-mulberry/5 hover:text-mulberry peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-mulberry/15"
                >
                  <CameraIcon aria-hidden="true" className="h-4 w-4" />
                  {file ? 'Cambiar' : 'Subir foto'}
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setErrors((currentErrors) => ({ ...currentErrors, avatar: undefined }));
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Retirar foto del equipo"
                  >
                    <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p id="team-avatar-help" className="mt-2 text-[11px] leading-4 text-slate-500">
                JPG o PNG · máx. 300 KB
              </p>
              {errors.avatar && (
                <p id="team-avatar-error" className="mt-1 text-xs text-red-600">
                  {errors.avatar}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre del equipo <span className="text-red-500">*</span>
              </label>
              <input
                id="team-name"
                value={teamName}
                onChange={(event) => {
                  setTeamName(event.target.value);
                  setErrors((currentErrors) => ({ ...currentErrors, name: undefined }));
                }}
                maxLength={MAX_TEAM_NAME_LENGTH}
                className="peloteras-form-control h-11 px-3"
                placeholder="Ej. Las Panteras"
                autoFocus
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'team-name-error' : 'team-name-help'}
              />
              {errors.name ? (
                <p id="team-name-error" className="mt-1.5 text-sm text-red-600">
                  {errors.name}
                </p>
              ) : (
                <p id="team-name-help" className="mt-1.5 text-xs text-slate-500">
                  Este nombre será visible en el perfil público del equipo.
                </p>
              )}

              <label htmlFor="team-max-members" className="mb-1.5 mt-4 block text-sm font-medium text-slate-700">
                Límite de integrantes <span className="text-red-500">*</span>
              </label>
              <input
                id="team-max-members"
                type="number"
                min={1}
                max={100}
                step={1}
                value={maxMembers}
                onChange={(event) => {
                  setMaxMembers(event.currentTarget.value);
                  setErrors((currentErrors) => ({ ...currentErrors, maxMembers: undefined }));
                }}
                className="peloteras-form-control h-11 px-3"
                aria-invalid={Boolean(errors.maxMembers)}
                aria-describedby={errors.maxMembers ? 'team-max-members-error' : 'team-max-members-help'}
              />
              {errors.maxMembers ? (
                <p id="team-max-members-error" className="mt-1.5 text-sm text-red-600">{errors.maxMembers}</p>
              ) : (
                <p id="team-max-members-help" className="mt-1.5 text-xs text-slate-500">
                  Podrás aumentarlo o reducirlo después, sin bajar del plantel activo.
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="team-social-title" className="border-t border-slate-100 pt-6">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="team-social-title" className="text-sm font-semibold text-slate-900">
                Redes sociales
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Opcional
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Puedes escribir solo el usuario o pegar el enlace completo del perfil.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="team-instagram" className="mb-1.5 block text-sm font-medium text-slate-700">
                Instagram
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  @
                </span>
                <input
                  id="team-instagram"
                  value={instagramUsername}
                  onChange={(event) => {
                    setInstagramUsername(event.target.value);
                    setErrors((currentErrors) => ({
                      ...currentErrors,
                      instagramUsername: undefined,
                    }));
                  }}
                  className="peloteras-form-control h-11 pl-8 pr-3"
                  placeholder="laspanteras"
                  aria-invalid={Boolean(errors.instagramUsername)}
                  aria-describedby={errors.instagramUsername ? 'team-instagram-error' : undefined}
                />
              </div>
              {errors.instagramUsername && (
                <p id="team-instagram-error" className="mt-1.5 text-sm text-red-600">
                  {errors.instagramUsername}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="team-tiktok" className="mb-1.5 block text-sm font-medium text-slate-700">
                TikTok
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  @
                </span>
                <input
                  id="team-tiktok"
                  value={tiktokUsername}
                  onChange={(event) => {
                    setTiktokUsername(event.target.value);
                    setErrors((currentErrors) => ({ ...currentErrors, tiktokUsername: undefined }));
                  }}
                  className="peloteras-form-control h-11 pl-8 pr-3"
                  placeholder="laspanteras"
                  aria-invalid={Boolean(errors.tiktokUsername)}
                  aria-describedby={errors.tiktokUsername ? 'team-tiktok-error' : undefined}
                />
              </div>
              {errors.tiktokUsername && (
                <p id="team-tiktok-error" className="mt-1.5 text-sm text-red-600">
                  {errors.tiktokUsername}
                </p>
              )}
            </div>
          </div>
        </section>

        {errors.server && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.server}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-xl bg-btnBg-light px-5 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creando…' : 'Crear equipo'}
        </button>
      </div>
    </form>
  );
}
