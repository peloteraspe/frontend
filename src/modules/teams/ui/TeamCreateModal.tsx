// src/modules/teams/ui/TeamCreateModal.tsx
'use client';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  server: string;
}>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (team: CreatedTeam) => void;
}

type CreatedTeam = {
  id: number;
  name: string;
  slug: string;
  avatar_url: string | null;
  instagram_username: string | null;
  tiktok_username: string | null;
};

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
    return 'La foto debe pesar 300 KB como maximo.';
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
              ? 'Ingresa un usuario o URL valida de Instagram.'
              : 'Ingresa un usuario o URL valida de TikTok.',
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
      error: `Usa solo letras, numeros, punto o guion bajo, hasta ${MAX_SOCIAL_HANDLE_LENGTH} caracteres.`,
    };
  }

  return { value: candidate, error: null };
}

export default function TeamCreateModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  useEffect(() => {
    if (!open) {
      setTeamName('');
      setFile(null);
      setInstagramUsername('');
      setTiktokUsername('');
      setErrors({});
      setSubmitting(false);
      idempotencyKeyRef.current = null;
    }
  }, [open]);

  const canSubmit = useMemo(() => !submitting, [submitting]);

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
    if (normalizedInstagram.error) nextErrors.instagramUsername = normalizedInstagram.error;
    if (normalizedTiktok.error) nextErrors.tiktokUsername = normalizedTiktok.error;

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return null;

    return {
      name,
      instagramUsername: normalizedInstagram.value,
      tiktokUsername: normalizedTiktok.value,
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
      if (file) body.set('avatar', file);
      if (formValues.instagramUsername) body.set('instagramUsername', formValues.instagramUsername);
      if (formValues.tiktokUsername) body.set('tiktokUsername', formValues.tiktokUsername);

      const res = await fetch('/api/teams', {
        method: 'POST',
        body,
      });
      const json = (await res.json().catch(() => null)) as
        | { team?: CreatedTeam; error?: string }
        | null;

      if (!res.ok || !json?.team) {
        const message = json?.error || 'No se pudo crear el equipo';
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
        throw new Error(json?.error || 'No se pudo crear el equipo');
      }

      trackEvent('team_created', {
        team_id: json.team.id,
        team_slug: json.team.slug,
        has_avatar: Boolean(file),
        has_instagram: Boolean(formValues.instagramUsername),
        has_tiktok: Boolean(formValues.tiktokUsername),
      });
      onCreated?.(json.team);
      onClose();
      router.refresh();
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : 'No se pudo crear el equipo. Intentalo nuevamente.';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative z-[81] max-h-[92vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Crear equipo</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800"
            aria-label="Cerrar formulario de creacion de equipo"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-stone-700">
            Nombre del equipo
          </label>
          <input
            id="team-name"
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              setErrors((currentErrors) => ({ ...currentErrors, name: undefined }));
            }}
            maxLength={MAX_TEAM_NAME_LENGTH}
            className="peloteras-form-control h-11 px-3"
            placeholder="Ej. Las Panteras"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'team-name-error' : undefined}
          />
          {errors.name && (
            <p id="team-name-error" className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="team-avatar" className="mb-1 block text-sm font-medium text-stone-700">
            Foto del equipo
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Previsualizacion de la foto del equipo"
                className="h-[72px] w-[72px] rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <input
                id="team-avatar"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  const avatarError = validateAvatar(nextFile);
                  setFile(avatarError ? null : nextFile);
                  setErrors((currentErrors) => ({ ...currentErrors, avatar: avatarError || undefined }));
                  if (avatarError) {
                    trackEvent('team_avatar_upload_failed', {
                      stage: 'client_validation',
                      reason: avatarError,
                    });
                  }
                  if (avatarError) e.target.value = '';
                }}
                className="peloteras-form-control peloteras-form-control--file h-11"
                aria-invalid={Boolean(errors.avatar)}
                aria-describedby="team-avatar-help"
              />
              <p id="team-avatar-help" className="mt-1 text-xs text-stone-500">
                JPG o PNG, maximo 300 KB.
              </p>
              {errors.avatar && <p className="mt-1 text-sm text-red-600">{errors.avatar}</p>}
            </div>
            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setErrors((currentErrors) => ({ ...currentErrors, avatar: undefined }));
                }}
                className="self-start rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Retirar
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="team-instagram" className="mb-1 block text-sm font-medium text-stone-700">
              Instagram
            </label>
            <input
              id="team-instagram"
              value={instagramUsername}
              onChange={(e) => {
                setInstagramUsername(e.target.value);
                setErrors((currentErrors) => ({ ...currentErrors, instagramUsername: undefined }));
              }}
              className="peloteras-form-control h-11 px-3"
              placeholder="@laspanteras"
              aria-invalid={Boolean(errors.instagramUsername)}
            />
            {errors.instagramUsername && (
              <p className="mt-1 text-sm text-red-600">{errors.instagramUsername}</p>
            )}
          </div>
          <div>
            <label htmlFor="team-tiktok" className="mb-1 block text-sm font-medium text-stone-700">
              TikTok
            </label>
            <input
              id="team-tiktok"
              value={tiktokUsername}
              onChange={(e) => {
                setTiktokUsername(e.target.value);
                setErrors((currentErrors) => ({ ...currentErrors, tiktokUsername: undefined }));
              }}
              className="peloteras-form-control h-11 px-3"
              placeholder="@laspanteras"
              aria-invalid={Boolean(errors.tiktokUsername)}
            />
            {errors.tiktokUsername && (
              <p className="mt-1 text-sm text-red-600">{errors.tiktokUsername}</p>
            )}
          </div>
        </div>

        {errors.server && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.server}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-btnBg-light px-4 py-2 text-sm font-semibold text-white hover:bg-btnBg-dark disabled:opacity-60"
          >
            {submitting ? 'Creando…' : 'Crear equipo'}
          </button>
        </div>
      </form>
    </div>
  );
}
