import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';

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

type PartnerLeadRow = {
  id: number;
  created_at: string | null;
  updated_at: string | null;
  lead_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_label: string | null;
  source: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
};

export type AdminRequestStatus = 'new' | 'contacted' | 'qualified' | 'closed';

export type AdminRequestCommitments = {
  reservedField: boolean;
  noCancellation: boolean;
  reportIncidents: boolean;
};

export type AdminRequestLinkedUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export type AdminRequestListItem = {
  id: number;
  createdAt: string | null;
  updatedAt: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  district: string;
  source: string;
  status: AdminRequestStatus;
  linkedUser: AdminRequestLinkedUser | null;
  commitments: AdminRequestCommitments;
};

export type AdminRequestDetail = AdminRequestListItem & {
  metadata: Record<string, unknown>;
};

function normalizeText(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown): AdminRequestStatus {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'contacted') return 'contacted';
  if (normalized === 'qualified') return 'qualified';
  if (normalized === 'closed') return 'closed';
  return 'new';
}

function parseMetadata(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isTruthy(value: unknown) {
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on', 'si', 'sí'].includes(normalized);
  }
  return false;
}

function parseCommitments(metadata: Record<string, unknown>): AdminRequestCommitments {
  return {
    reservedField: isTruthy(metadata.commitment_reserved_field),
    noCancellation: isTruthy(metadata.commitment_no_cancellation),
    reportIncidents: isTruthy(metadata.commitment_report_incidents),
  };
}

function resolveStatusLabel(status: AdminRequestStatus) {
  if (status === 'contacted') return 'Contactada';
  if (status === 'qualified') return 'Aprobada';
  if (status === 'closed') return 'Rechazada';
  return 'Pendiente';
}

function normalizeName(user: AuthUserLite, profileByUserId: Map<string, string>) {
  const profileName = profileByUserId.get(user.id);
  if (profileName) return profileName;

  const metadataName =
    normalizeText(user.user_metadata?.username) || normalizeText(user.user_metadata?.full_name);
  if (metadataName) return metadataName;

  const emailName = normalizeText(user.email).split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Sin nombre';
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
  const { data, error } = await adminSupabase.from('profile').select('user,username');
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  ((data ?? []) as ProfileRow[]).forEach((row) => {
    const userId = normalizeText(row.user);
    const username = normalizeText(row.username);
    if (userId && username) {
      map.set(userId, username);
    }
  });

  return map;
}

function buildLinkedUser(
  user: AuthUserLite | null,
  profileByUserId: Map<string, string>
): AdminRequestLinkedUser | null {
  if (!user?.id) return null;

  return {
    id: user.id,
    name: normalizeName(user, profileByUserId),
    email: normalizeText(user.email, 'Sin correo'),
    isAdmin: isAdmin(user as any),
    isSuperAdmin: isSuperAdmin(user as any),
  };
}

function buildRequestItem(
  row: PartnerLeadRow,
  authUserById: Map<string, AuthUserLite>,
  authUserByEmail: Map<string, AuthUserLite>,
  profileByUserId: Map<string, string>
): AdminRequestDetail {
  const metadata = parseMetadata(row.metadata);
  const normalizedUserId = normalizeText(row.user_id);
  const normalizedEmail = normalizeEmail(row.contact_email);
  const linkedUser =
    buildLinkedUser(authUserById.get(normalizedUserId) || null, profileByUserId) ||
    buildLinkedUser(authUserByEmail.get(normalizedEmail) || null, profileByUserId);

  return {
    id: Number(row.id),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    contactName: normalizeText(row.contact_name, 'Sin nombre'),
    contactEmail: normalizeText(row.contact_email, 'Sin correo'),
    contactPhone: normalizeText(row.contact_phone, 'Sin celular'),
    district: normalizeText(row.location_label, 'Sin distrito'),
    source: normalizeText(row.source, 'admin_capture_page'),
    status: normalizeStatus(row.status),
    linkedUser,
    commitments: parseCommitments(metadata),
    metadata,
  };
}

export function getAdminRequestStatusLabel(status: AdminRequestStatus) {
  return resolveStatusLabel(status);
}

export async function getAdminRequests(statusFilter?: string): Promise<AdminRequestListItem[]> {
  const adminSupabase = getAdminSupabase();
  const normalizedFilter = normalizeStatus(statusFilter);

  let query = adminSupabase
    .from('partner_leads')
    .select('id,created_at,updated_at,lead_type,contact_name,contact_email,contact_phone,location_label,source,user_id,metadata,status')
    .eq('lead_type', 'admin')
    .order('created_at', { ascending: false });

  if (normalizeText(statusFilter) && normalizeText(statusFilter).toLowerCase() !== 'all') {
    query = query.eq('status', normalizedFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const [authUsers, profileByUserId] = await Promise.all([listAllAuthUsers(), getProfileNameMap()]);
  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  const authUserByEmail = new Map(
    authUsers
      .map((user) => [normalizeEmail(user.email), user] as const)
      .filter(([email]) => Boolean(email))
  );

  return ((data ?? []) as PartnerLeadRow[]).map((row) =>
    buildRequestItem(row, authUserById, authUserByEmail, profileByUserId)
  );
}

export async function getAdminRequestById(requestId: number): Promise<AdminRequestDetail | null> {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('partner_leads')
    .select('id,created_at,updated_at,lead_type,contact_name,contact_email,contact_phone,location_label,source,user_id,metadata,status')
    .eq('lead_type', 'admin')
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [authUsers, profileByUserId] = await Promise.all([listAllAuthUsers(), getProfileNameMap()]);
  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  const authUserByEmail = new Map(
    authUsers
      .map((user) => [normalizeEmail(user.email), user] as const)
      .filter(([email]) => Boolean(email))
  );

  return buildRequestItem(data as PartnerLeadRow, authUserById, authUserByEmail, profileByUserId);
}

export async function updateAdminRequestStatus(
  requestId: number,
  status: AdminRequestStatus,
  reviewerId: string
) {
  const adminSupabase = getAdminSupabase();
  const { data: current, error: currentError } = await adminSupabase
    .from('partner_leads')
    .select('id,metadata')
    .eq('lead_type', 'admin')
    .eq('id', requestId)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error('Solicitud no encontrada.');

  const now = new Date().toISOString();
  const metadata = parseMetadata(current.metadata);
  const nextMetadata = {
    ...metadata,
    review_status: status,
    reviewed_by: reviewerId,
    reviewed_at: now,
  };

  const { error } = await adminSupabase
    .from('partner_leads')
    .update({
      status,
      updated_at: now,
      metadata: nextMetadata,
    })
    .eq('lead_type', 'admin')
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}

export async function resolveAdminRequestTargetUserId(requestId: number): Promise<string | null> {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('partner_leads')
    .select('id,user_id,contact_email')
    .eq('lead_type', 'admin')
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Solicitud no encontrada.');

  const directUserId = normalizeText(data.user_id);
  if (directUserId) return directUserId;

  const email = normalizeEmail(data.contact_email);
  if (!email) return null;

  const authUsers = await listAllAuthUsers();
  const matchedUser = authUsers.find((user) => normalizeEmail(user.email) === email);
  return matchedUser?.id || null;
}

export async function attachResolvedUserToAdminRequest(requestId: number, userId: string) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) return;

  const adminSupabase = getAdminSupabase();
  const { error } = await adminSupabase
    .from('partner_leads')
    .update({
      user_id: normalizedUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('lead_type', 'admin')
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}
