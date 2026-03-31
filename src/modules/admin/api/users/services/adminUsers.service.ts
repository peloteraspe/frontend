'use server';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { type AdminRequestStatus } from '@modules/admin/api/requests/services/adminRequests.service';

type AuthUserLite = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
};

type ProfileRow = {
  user: string;
  username: string | null;
};

export type OrganizerActivationInput = {
  phone: string;
  source?: string;
  commitmentReservedField: boolean;
  commitmentNoCancellation: boolean;
  commitmentReportIncidents: boolean;
};

type PartnerLeadRow = {
  id: number;
  user_id: string | null;
  contact_email: string | null;
  status: string | null;
  created_at: string | null;
};

export type AdminRequestSummary = {
  id: number;
  status: AdminRequestStatus;
  createdAt: string | null;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  latestAdminRequest: AdminRequestSummary | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeName(user: AuthUserLite, profileByUserId: Map<string, string>) {
  const profileName = profileByUserId.get(user.id);
  if (profileName) return profileName;

  const metadataName =
    String(user.user_metadata?.username || user.user_metadata?.full_name || '').trim();
  if (metadataName) return metadataName;

  const emailName = String(user.email || '').split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Sin nombre';
}

function normalizeContactName(user: AuthUserLite, profileName?: string | null) {
  const nextProfileName = String(profileName || '').trim();
  if (nextProfileName) return nextProfileName;

  const metadataName = String(user.user_metadata?.username || user.user_metadata?.full_name || '').trim();
  if (metadataName) return metadataName;

  const emailName = String(user.email || '').split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Pelotera';
}

function normalizeStatus(value: unknown): AdminRequestStatus {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'contacted') return 'contacted';
  if (normalized === 'qualified') return 'qualified';
  if (normalized === 'closed') return 'closed';
  return 'new';
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function listAllAuthUsers() {
  const adminSupabase = getAdminSupabase();
  const users: AuthUserLite[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const chunk = (data?.users ?? []) as AuthUserLite[];
    users.push(...chunk);

    if (chunk.length < perPage) break;
    page += 1;
  }

  return users;
}

async function getProfileNameMap() {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('profile')
    .select('user,username')
    .order('username', { ascending: true });

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  ((data ?? []) as ProfileRow[]).forEach((row) => {
    const userId = String(row.user || '').trim();
    const username = String(row.username || '').trim();
    if (userId && username) {
      map.set(userId, username);
    }
  });
  return map;
}

async function getProfileNameByUserId(userId: string) {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('profile')
    .select('username')
    .eq('user', userId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return String(data?.username || '').trim() || null;
}

async function getLatestAdminRequestLookup() {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('partner_leads')
    .select('id,user_id,contact_email,status,created_at')
    .eq('lead_type', 'admin')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const byUserId = new Map<string, AdminRequestSummary>();
  const byEmail = new Map<string, AdminRequestSummary>();

  ((data ?? []) as PartnerLeadRow[]).forEach((row) => {
    const summary = {
      id: Number(row.id),
      status: normalizeStatus(row.status),
      createdAt: row.created_at || null,
    };

    const userId = String(row.user_id || '').trim();
    const email = normalizeEmail(row.contact_email);

    if (userId && !byUserId.has(userId)) {
      byUserId.set(userId, summary);
    }

    if (email && !byEmail.has(email)) {
      byEmail.set(email, summary);
    }
  });

  return { byUserId, byEmail };
}

export async function getAdminUsersList(): Promise<AdminUserListItem[]> {
  const [authUsers, profileNameMap, latestAdminRequestLookup] = await Promise.all([
    listAllAuthUsers(),
    getProfileNameMap(),
    getLatestAdminRequestLookup(),
  ]);

  return authUsers
    .filter((user) => Boolean(user?.id) && Boolean(String(user?.email || '').trim()))
    .map((user) => {
      const email = String(user.email || '').trim();
      const latestAdminRequest =
        latestAdminRequestLookup.byUserId.get(user.id) ||
        latestAdminRequestLookup.byEmail.get(normalizeEmail(email)) ||
        null;

      return {
        id: user.id,
        name: normalizeName(user, profileNameMap),
        email,
        isAdmin: isAdmin(user as any),
        isSuperAdmin: isSuperAdmin(user as any),
        latestAdminRequest,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export async function setAdminRoleByUserId(userId: string, enableAdmin: boolean) {
  const normalizedId = String(userId || '').trim();
  if (!normalizedId) throw new Error('Id de usuario inválido.');

  const adminSupabase = getAdminSupabase();

  const { data: target, error: targetError } = await adminSupabase.auth.admin.getUserById(normalizedId);
  if (targetError) throw new Error(targetError.message);
  if (!target?.user) throw new Error('Usuario no encontrado.');

  const targetUser = target.user as AuthUserLite;
  const targetIsSuperAdmin = isSuperAdmin(targetUser as any);

  if (!enableAdmin && targetIsSuperAdmin) {
    throw new Error('No puedes retirar permisos admin a una superadmin.');
  }

  const currentAppMetadata = (targetUser.app_metadata ?? {}) as Record<string, any>;
  const currentUserMetadata = (targetUser.user_metadata ?? {}) as Record<string, any>;

  const nextAppMetadata: Record<string, any> = {
    ...currentAppMetadata,
    is_admin: enableAdmin,
  };
  const nextUserMetadata: Record<string, any> = {
    ...currentUserMetadata,
    is_admin: enableAdmin,
  };

  if (enableAdmin) {
    if (nextAppMetadata.role !== 'superadmin') nextAppMetadata.role = 'admin';
    if (nextUserMetadata.role !== 'superadmin') nextUserMetadata.role = 'admin';
  } else {
    if (nextAppMetadata.role === 'admin') delete nextAppMetadata.role;
    if (nextUserMetadata.role === 'admin') delete nextUserMetadata.role;
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(normalizedId, {
    app_metadata: nextAppMetadata,
    user_metadata: nextUserMetadata,
  });
  if (updateError) throw new Error(updateError.message);
}

export async function activateOrganizerByUserId(userId: string, input: OrganizerActivationInput) {
  const normalizedId = String(userId || '').trim();
  if (!normalizedId) throw new Error('Id de usuario inválido.');

  const normalizedPhone = String(input.phone || '').trim();
  if (!normalizedPhone) throw new Error('Ingresa un celular válido.');
  if (!input.commitmentReservedField || !input.commitmentNoCancellation || !input.commitmentReportIncidents) {
    throw new Error('Debes aceptar todos los compromisos para activar tu perfil organizadora.');
  }

  const adminSupabase = getAdminSupabase();
  const { data: target, error: targetError } = await adminSupabase.auth.admin.getUserById(normalizedId);
  if (targetError) throw new Error(targetError.message);
  if (!target?.user) throw new Error('Usuario no encontrado.');

  const targetUser = target.user as AuthUserLite;
  const currentAppMetadata = (targetUser.app_metadata ?? {}) as Record<string, any>;
  const currentUserMetadata = (targetUser.user_metadata ?? {}) as Record<string, any>;
  const activatedAt = new Date().toISOString();
  const source = String(input.source || 'self_serve_events').trim() || 'self_serve_events';

  const nextAppMetadata: Record<string, any> = {
    ...currentAppMetadata,
    is_admin: true,
    organizer_phone: normalizedPhone,
    organizer_activated_at: activatedAt,
    organizer_activation_source: source,
    organizer_commitment_reserved_field: true,
    organizer_commitment_no_cancellation: true,
    organizer_commitment_report_incidents: true,
  };
  const nextUserMetadata: Record<string, any> = {
    ...currentUserMetadata,
    is_admin: true,
    organizer_phone: normalizedPhone,
    organizer_activated_at: activatedAt,
    organizer_activation_source: source,
    organizer_commitment_reserved_field: true,
    organizer_commitment_no_cancellation: true,
    organizer_commitment_report_incidents: true,
  };

  if (nextAppMetadata.role !== 'superadmin') nextAppMetadata.role = 'admin';
  if (nextUserMetadata.role !== 'superadmin') nextUserMetadata.role = 'admin';

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(normalizedId, {
    app_metadata: nextAppMetadata,
    user_metadata: nextUserMetadata,
  });
  if (updateError) throw new Error(updateError.message);

  const profileName = await getProfileNameByUserId(normalizedId);

  return {
    activatedAt,
    contactEmail: String(targetUser.email || '').trim().toLowerCase() || null,
    contactName: normalizeContactName(targetUser, profileName),
    phone: normalizedPhone,
    source,
  };
}

export async function getUserEmailsForBroadcastByIds(userIds: string[]): Promise<string[]> {
  const normalizedIds = Array.from(
    new Set(
      userIds
        .map((userId) => String(userId || '').trim())
        .filter(Boolean)
    )
  );

  if (!normalizedIds.length) return [];

  const allowedIds = new Set(normalizedIds);
  const authUsers = await listAllAuthUsers();

  return Array.from(
    new Set(
      authUsers
        .filter((user) => allowedIds.has(String(user?.id || '').trim()))
        .map((user) => String(user?.email || '').trim().toLowerCase())
        .filter((email) => isValidEmail(email))
    )
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

export async function getAllUserEmailsForBroadcast(): Promise<string[]> {
  const authUsers = await listAllAuthUsers();

  return Array.from(
    new Set(
      authUsers
        .map((user) => String(user?.email || '').trim().toLowerCase())
        .filter((email) => isValidEmail(email))
    )
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}
