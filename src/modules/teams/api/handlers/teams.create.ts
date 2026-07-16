// src/modules/teams/api/handlers/teams.create.ts
import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getCurrentUserId } from '@core/auth/supabase-user';
import { HTTP_401, jsonNoStore } from '@core/api/responses';
import type { CreateTeamBody } from '@modules/teams/model/types';
import { createTeamWithCaptain } from '@modules/teams/api/services/teams.service';

const TEAM_AVATARS_BUCKET = 'team-avatars';
const MAX_AVATAR_BYTES = 300 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const TEAM_AVATAR_BUCKET_CONFIG = {
  public: true,
  fileSizeLimit: '300KB',
  allowedMimeTypes: Array.from(ALLOWED_AVATAR_MIME_TYPES),
};

type CreateTeamPayload = {
  name: string;
  avatarFile: File | null;
  instagramUsername: string | null;
  tiktokUsername: string | null;
  idempotencyKey: string | null;
};

type TeamAvatarUploadResult =
  | { error: string; publicUrl: null; path: null }
  | { error: null; publicUrl: string; path: string };

function toOptionalHandle(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^@+/, '');
  return trimmed || null;
}

function getAvatarExtension(fileName: string) {
  return fileName.split('.').pop()?.trim().toLowerCase() || '';
}

function resolveStorageExtension(file: File) {
  const extension = getAvatarExtension(file.name);
  if (extension === 'jpeg') return 'jpg';
  return extension;
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array) {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function validateAvatarFile(file: File) {
  const extension = getAvatarExtension(file.name);

  if (!ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
    return 'La foto debe ser JPG, JPEG o PNG.';
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
    return 'La foto debe tener MIME image/jpeg o image/png.';
  }

  if (!file.size) {
    return 'La foto no puede estar vacia.';
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return 'La foto debe pesar 300 KB como maximo.';
  }

  return null;
}

function validateAvatarSignature(file: File, bytes: Uint8Array) {
  if (file.type === 'image/jpeg' && !isJpeg(bytes)) {
    return 'El contenido del archivo no coincide con JPG.';
  }

  if (file.type === 'image/png' && !isPng(bytes)) {
    return 'El contenido del archivo no coincide con PNG.';
  }

  return null;
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

function normalizeIdempotencyKey(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return IDEMPOTENCY_KEY_PATTERN.test(trimmed) ? trimmed : null;
}

function isAlreadyExistsError(error: unknown) {
  const maybeError = error as { message?: unknown; statusCode?: unknown };
  const message = typeof maybeError.message === 'string' ? maybeError.message.toLowerCase() : '';
  return message.includes('already exists') || Number(maybeError.statusCode) === 409;
}

async function ensureTeamAvatarBucket() {
  const adminSupabase = getAdminSupabase();
  const { data: bucket, error: getBucketError } = await adminSupabase.storage.getBucket(TEAM_AVATARS_BUCKET);

  if (bucket) {
    const needsUpdate =
      !bucket.public ||
      bucket.file_size_limit !== MAX_AVATAR_BYTES ||
      JSON.stringify(bucket.allowed_mime_types ?? []) !==
        JSON.stringify(TEAM_AVATAR_BUCKET_CONFIG.allowedMimeTypes);

    if (needsUpdate) {
      const { error: updateBucketError } = await adminSupabase.storage.updateBucket(
        TEAM_AVATARS_BUCKET,
        TEAM_AVATAR_BUCKET_CONFIG
      );

      if (updateBucketError) {
        console.warn('Team avatar bucket update failed, continuing with existing bucket:', updateBucketError);
      }
    }

    return adminSupabase;
  }

  if (getBucketError) {
    console.warn('Team avatar bucket lookup failed, attempting creation:', getBucketError);
  }

  const { error: createBucketError } = await adminSupabase.storage.createBucket(
    TEAM_AVATARS_BUCKET,
    TEAM_AVATAR_BUCKET_CONFIG
  );

  if (createBucketError && !isAlreadyExistsError(createBucketError)) {
    console.error('Team avatar bucket creation failed:', createBucketError);
    throw new Error('No se pudo preparar el almacenamiento de fotos de equipo.');
  }

  return adminSupabase;
}

async function parseCreateTeamPayload(req: Request): Promise<CreateTeamPayload | NextResponse> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const avatarValue = formData.get('avatar');

    return {
      name: getStringFormValue(formData, 'name')?.trim() || '',
      avatarFile: avatarValue instanceof File && avatarValue.size > 0 ? avatarValue : null,
      instagramUsername: toOptionalHandle(getStringFormValue(formData, 'instagramUsername')),
      tiktokUsername: toOptionalHandle(getStringFormValue(formData, 'tiktokUsername')),
      idempotencyKey: normalizeIdempotencyKey(getStringFormValue(formData, 'idempotencyKey')),
    };
  }

  let raw: CreateTeamBody;
  try {
    raw = (await req.json()) as CreateTeamBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (raw.imageUrl || raw.avatarPath) {
    return NextResponse.json(
      { error: 'La foto del equipo debe subirse como archivo.' },
      { status: 400 }
    );
  }

  return {
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    avatarFile: null,
    instagramUsername: toOptionalHandle(raw.instagramUsername),
    tiktokUsername: toOptionalHandle(raw.tiktokUsername),
    idempotencyKey: normalizeIdempotencyKey(raw.idempotencyKey),
  };
}

async function uploadTeamAvatar(file: File, ownerId: string): Promise<TeamAvatarUploadResult> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    return { error: validationError, publicUrl: null, path: null };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signatureError = validateAvatarSignature(file, bytes);
  if (signatureError) {
    return { error: signatureError, publicUrl: null, path: null };
  }

  const adminSupabase = await ensureTeamAvatarBucket();
  const extension = resolveStorageExtension(file);
  const path = `avatars/${ownerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await adminSupabase.storage
    .from(TEAM_AVATARS_BUCKET)
    .upload(path, bytes, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Team avatar upload failed:', uploadError);
    return { error: 'No se pudo subir la foto del equipo.', publicUrl: null, path: null };
  }

  const { data } = adminSupabase.storage.from(TEAM_AVATARS_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl?.trim() || null;

  if (!publicUrl) {
    return { error: 'No se pudo obtener la URL de la foto del equipo.', publicUrl: null, path: null };
  }

  return { error: null, publicUrl, path };
}

async function removeUploadedTeamAvatar(path: string | null) {
  if (!path) return;

  const { error } = await getAdminSupabase().storage.from(TEAM_AVATARS_BUCKET).remove([path]);
  if (error) {
    console.error('Team avatar cleanup failed:', error);
  }
}

export async function POST(req: Request) {
  try {
    const ownerId = await getCurrentUserId();
    if (!ownerId) return HTTP_401;

    const payload = await parseCreateTeamPayload(req);
    if (payload instanceof NextResponse) return payload;

    if (payload.name.length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 chars)' }, { status: 400 });
    }

    let avatarUrl: string | null = null;
    let avatarPath: string | null = null;
    if (payload.avatarFile) {
      const uploadResult = await uploadTeamAvatar(payload.avatarFile, ownerId);
      if (uploadResult.error) {
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }
      avatarUrl = uploadResult.publicUrl;
      avatarPath = uploadResult.path;
    }

    try {
      const team = await createTeamWithCaptain(
        payload.name,
        avatarUrl,
        payload.instagramUsername,
        payload.tiktokUsername,
        ownerId,
        payload.idempotencyKey
      );

      if (avatarPath && avatarUrl && team.avatar_url !== avatarUrl) {
        await removeUploadedTeamAvatar(avatarPath);
      }

      return jsonNoStore({ ok: true, team }, 201);
    } catch (error) {
      await removeUploadedTeamAvatar(avatarPath);
      throw error;
    }
  } catch (err) {
    console.error('POST /api/teams failed:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
