'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { setAdminRoleByUserId } from '@modules/admin/api/users/services/adminUsers.service';
import {
  attachResolvedUserToAdminRequest,
  resolveAdminRequestTargetUserId,
  updateAdminRequestStatus,
} from './services/adminRequests.service';

function normalizeText(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function parseRequestId(value: unknown) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function appendFlash(basePath: string, type: 'message' | 'error', value: string) {
  const target = normalizeText(basePath, '/admin/requests');
  const separator = target.includes('?') ? '&' : '?';
  return `${target}${separator}${type}=${encodeURIComponent(value)}`;
}

async function assertSuperAdminUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede revisar solicitudes admin.');
  }

  const userId = normalizeText(user?.id);
  if (!userId) {
    throw new Error('Debes iniciar sesión para continuar.');
  }

  return userId;
}

function revalidateAdminRequestPaths(redirectTo: string) {
  revalidatePath('/admin/requests');
  revalidatePath('/admin/users');

  const cleanPath = redirectTo.split('?')[0] || '/admin/requests';
  revalidatePath(cleanPath);
}

export async function markAdminRequestContacted(formData: FormData) {
  const redirectTo = normalizeText(formData.get('redirectTo'), '/admin/requests');
  let destination = redirectTo;

  try {
    const reviewerId = await assertSuperAdminUser();
    const requestId = parseRequestId(formData.get('requestId'));
    if (!requestId) throw new Error('Solicitud inválida.');

    await updateAdminRequestStatus(requestId, 'contacted', reviewerId);
    revalidateAdminRequestPaths(redirectTo);
    destination = appendFlash(redirectTo, 'message', 'Solicitud marcada como contactada.');
  } catch (error) {
    destination = appendFlash(
      redirectTo,
      'error',
      error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.'
    );
  }

  redirect(destination);
}

export async function approveAdminRequest(formData: FormData) {
  const redirectTo = normalizeText(formData.get('redirectTo'), '/admin/requests');
  let destination = redirectTo;

  try {
    const reviewerId = await assertSuperAdminUser();
    const requestId = parseRequestId(formData.get('requestId'));
    if (!requestId) throw new Error('Solicitud inválida.');

    const targetUserId = await resolveAdminRequestTargetUserId(requestId);
    if (!targetUserId) {
      throw new Error('Esta solicitud no está vinculada a una cuenta. Pide a la jugadora que inicie sesión primero.');
    }

    await attachResolvedUserToAdminRequest(requestId, targetUserId);
    await setAdminRoleByUserId(targetUserId, true);
    await updateAdminRequestStatus(requestId, 'qualified', reviewerId);

    revalidateAdminRequestPaths(redirectTo);
    destination = appendFlash(redirectTo, 'message', 'Permisos admin activados correctamente.');
  } catch (error) {
    destination = appendFlash(
      redirectTo,
      'error',
      error instanceof Error ? error.message : 'No se pudo aprobar la solicitud.'
    );
  }

  redirect(destination);
}

export async function rejectAdminRequest(formData: FormData) {
  const redirectTo = normalizeText(formData.get('redirectTo'), '/admin/requests');
  let destination = redirectTo;

  try {
    const reviewerId = await assertSuperAdminUser();
    const requestId = parseRequestId(formData.get('requestId'));
    if (!requestId) throw new Error('Solicitud inválida.');

    await updateAdminRequestStatus(requestId, 'closed', reviewerId);
    revalidateAdminRequestPaths(redirectTo);
    destination = appendFlash(redirectTo, 'message', 'Solicitud marcada como rechazada.');
  } catch (error) {
    destination = appendFlash(
      redirectTo,
      'error',
      error instanceof Error ? error.message : 'No se pudo rechazar la solicitud.'
    );
  }

  redirect(destination);
}
