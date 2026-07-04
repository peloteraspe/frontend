'use server';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { getServerSupabase } from '@core/api/supabase.server';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';
import {
  ADMIN_FEATURE_FLAG_KEYS,
  ORGANIZER_STATUSES,
  type AdminFeatureFlagKey,
  type AdminFeatureFlagsState,
  type OrganizerListItem,
  type OrganizerOption,
  type OrganizersAdminData,
  type OrganizerStatus,
} from '@modules/admin/model/organizers';

type OrganizerRow = {
  id: string;
  user_id: string | null;
  profile_id: number | null;
  partner_lead_id: number | null;
  status: OrganizerStatus;
  source: string | null;
  zone: string | null;
  experience_level: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PartnerLeadRow = {
  id: number;
  created_at: string | null;
  lead_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  organization_name: string | null;
  location_label: string | null;
  interest_level: string | null;
  source: string | null;
  user_id: string | null;
  status: string | null;
};

type ProfileRow = {
  id: number;
  user: string | null;
  username: string | null;
};

type AdminFeatureFlagsRow = {
  id: string;
  user_id: string;
  can_create_events: boolean | null;
  can_manage_own_events: boolean | null;
  can_view_participants: boolean | null;
  can_manage_payments: boolean | null;
  can_scan_tickets: boolean | null;
  can_manage_finances: boolean | null;
  can_view_reports: boolean | null;
  can_manage_organizers: boolean | null;
  enabled_by: string | null;
  notes: string | null;
  updated_at: string | null;
};

function normalizeText(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeStatus(value: unknown): OrganizerStatus {
  const status = String(value || '').trim();
  if (ORGANIZER_STATUSES.includes(status as OrganizerStatus)) return status as OrganizerStatus;
  throw new Error('Estado de organizadora invalido.');
}

function createEmptyFlags(row?: AdminFeatureFlagsRow | null): AdminFeatureFlagsState {
  return ADMIN_FEATURE_FLAG_KEYS.reduce(
    (state, key) => ({
      ...state,
      [key]: Boolean(row?.[key]),
    }),
    {
      id: row?.id ?? null,
      enabledBy: row?.enabled_by ?? null,
      notes: row?.notes ?? null,
      updatedAt: row?.updated_at ?? null,
    } as AdminFeatureFlagsState
  );
}

async function requireSuperAdminUserId() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede gestionar organizadoras.');
  }

  return user.id;
}

async function getProfileByUserIds(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, ProfileRow>();

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('profile')
    .select('id,user,username')
    .in('user', uniqueIds);

  if (error) throw new Error(error.message);

  const profilesByUserId = new Map<string, ProfileRow>();
  ((data ?? []) as ProfileRow[]).forEach((profile) => {
    const userId = normalizeText(profile.user);
    if (userId && !profilesByUserId.has(userId)) profilesByUserId.set(userId, profile);
  });

  return profilesByUserId;
}

export async function getOrganizersAdminData(): Promise<OrganizersAdminData> {
  await requireSuperAdminUserId();

  const admin = getAdminSupabase();
  const [organizersResult, leadsResult] = await Promise.all([
    admin
      .from('organizers')
      .select('id,user_id,profile_id,partner_lead_id,status,source,zone,experience_level,internal_notes,created_at,updated_at')
      .order('created_at', { ascending: false }),
    admin
      .from('partner_leads')
      .select('id,created_at,lead_type,contact_name,contact_email,contact_phone,organization_name,location_label,interest_level,source,user_id,status')
      .eq('lead_type', 'admin')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (organizersResult.error) throw new Error(organizersResult.error.message);
  if (leadsResult.error) throw new Error(leadsResult.error.message);

  const organizers = (organizersResult.data ?? []) as OrganizerRow[];
  const partnerLeads = (leadsResult.data ?? []) as PartnerLeadRow[];
  const userIds = organizers
    .map((organizer) => organizer.user_id)
    .concat(partnerLeads.map((lead) => lead.user_id))
    .filter((id): id is string => Boolean(id));

  const flagUserIds = organizers.map((organizer) => organizer.user_id).filter((id): id is string => Boolean(id));
  const [profilesByUserId, flagsResult] = await Promise.all([
    getProfileByUserIds(userIds),
    flagUserIds.length
      ? admin
          .from('admin_feature_flags')
          .select('id,user_id,can_create_events,can_manage_own_events,can_view_participants,can_manage_payments,can_scan_tickets,can_manage_finances,can_view_reports,can_manage_organizers,enabled_by,notes,updated_at')
          .in('user_id', flagUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (flagsResult.error) throw new Error(flagsResult.error.message);

  const flagsByUserId = new Map<string, AdminFeatureFlagsRow>();
  ((flagsResult.data ?? []) as AdminFeatureFlagsRow[]).forEach((row) => {
    flagsByUserId.set(row.user_id, row);
  });

  const leadsById = new Map<number, PartnerLeadRow>();
  partnerLeads.forEach((lead) => leadsById.set(lead.id, lead));

  const organizersByLeadId = new Map<number, string>();
  const organizersByUserId = new Map<string, string>();
  organizers.forEach((organizer) => {
    if (organizer.partner_lead_id) organizersByLeadId.set(organizer.partner_lead_id, organizer.id);
    if (organizer.user_id) organizersByUserId.set(organizer.user_id, organizer.id);
  });

  const organizerItems = organizers.map((organizer) => {
    const lead = organizer.partner_lead_id ? leadsById.get(organizer.partner_lead_id) : null;
    const profile = organizer.user_id ? profilesByUserId.get(organizer.user_id) : null;
    const leadName = normalizeText(lead?.organization_name) || normalizeText(lead?.contact_name);
    const profileName = normalizeText(profile?.username);

    return {
      id: organizer.id,
      userId: organizer.user_id,
      profileId: organizer.profile_id,
      partnerLeadId: organizer.partner_lead_id,
      displayName: leadName || profileName || `Organizadora ${organizer.id.slice(0, 8)}`,
      contactEmail: normalizeText(lead?.contact_email),
      contactPhone: normalizeText(lead?.contact_phone),
      source: normalizeText(organizer.source) || 'full_chocolate',
      status: organizer.status,
      zone: normalizeText(organizer.zone),
      experienceLevel: normalizeText(organizer.experience_level),
      internalNotes: normalizeText(organizer.internal_notes),
      createdAt: organizer.created_at,
      flags: organizer.user_id ? createEmptyFlags(flagsByUserId.get(organizer.user_id)) : null,
    };
  });

  const leadItems = partnerLeads.map((lead) => {
    const profile = lead.user_id ? profilesByUserId.get(lead.user_id) : null;
    const linkedOrganizerId =
      organizersByLeadId.get(lead.id) || (lead.user_id ? organizersByUserId.get(lead.user_id) : null) || null;

    return {
      id: lead.id,
      displayName:
        normalizeText(lead.organization_name) ||
        normalizeText(lead.contact_name) ||
        normalizeText(profile?.username) ||
        `Postulacion ${lead.id}`,
      contactEmail: normalizeText(lead.contact_email),
      contactPhone: normalizeText(lead.contact_phone),
      source: normalizeText(lead.source) || 'landing_growth_blocks',
      status: normalizeText(lead.status) || 'new',
      zone: normalizeText(lead.location_label),
      experienceLevel: normalizeText(lead.interest_level),
      createdAt: lead.created_at,
      userId: normalizeText(lead.user_id),
      linkedOrganizerId,
    };
  });

  return {
    organizers: organizerItems,
    partnerLeads: leadItems,
  };
}

export async function getOrganizerOptionsForEventForm(): Promise<OrganizerOption[]> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user as any)) {
    throw new Error('No tienes permisos para gestionar eventos.');
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('organizers')
    .select('id,user_id,profile_id,partner_lead_id,status,source,zone,experience_level,internal_notes,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const organizers = (data ?? []) as OrganizerRow[];
  const partnerLeadIds = organizers
    .map((organizer) => Number(organizer.partner_lead_id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const userIds = organizers.map((organizer) => organizer.user_id).filter((id): id is string => Boolean(id));

  const [leadsResult, profilesByUserId] = await Promise.all([
    partnerLeadIds.length
      ? admin
          .from('partner_leads')
          .select('id,contact_name,contact_email,organization_name,location_label')
          .in('id', partnerLeadIds)
      : Promise.resolve({ data: [], error: null }),
    getProfileByUserIds(userIds),
  ]);

  if (leadsResult.error) throw new Error(leadsResult.error.message);

  type OrganizerLeadOptionRow = Pick<
    PartnerLeadRow,
    'id' | 'contact_name' | 'contact_email' | 'organization_name' | 'location_label'
  >;
  const leadsById = new Map<number, OrganizerLeadOptionRow>();
  ((leadsResult.data ?? []) as OrganizerLeadOptionRow[]).forEach((lead) => {
    leadsById.set(lead.id, lead);
  });

  return organizers.map((organizer) => {
    const lead = organizer.partner_lead_id ? leadsById.get(organizer.partner_lead_id) : null;
    const profile = organizer.user_id ? profilesByUserId.get(organizer.user_id) : null;
    const leadName = normalizeText(lead?.organization_name) || normalizeText(lead?.contact_name);
    const profileName = normalizeText(profile?.username);

    return {
      id: organizer.id,
      displayName: leadName || profileName || `Organizadora ${organizer.id.slice(0, 8)}`,
      status: organizer.status,
      contactEmail: normalizeText(lead?.contact_email),
      zone: normalizeText(lead?.location_label) || normalizeText(organizer.zone),
    };
  });
}

export async function createOrganizerFromPartnerLead(leadId: number) {
  await requireSuperAdminUserId();
  if (!Number.isInteger(leadId) || leadId <= 0) throw new Error('Postulacion invalida.');

  const admin = getAdminSupabase();
  const { data: lead, error: leadError } = await admin
    .from('partner_leads')
    .select('id,lead_type,contact_name,organization_name,location_label,interest_level,user_id')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) throw new Error(leadError.message);
  if (!lead || String(lead.lead_type || '') !== 'admin') {
    throw new Error('Postulacion de organizadora no encontrada.');
  }

  const userId = normalizeText(lead.user_id);
  const profile = userId ? (await getProfileByUserIds([userId])).get(userId) : null;
  const profileId = profile?.id ?? null;
  const duplicateFilters = [`partner_lead_id.eq.${leadId}`];
  if (userId) duplicateFilters.push(`user_id.eq.${userId}`);
  if (profileId) duplicateFilters.push(`profile_id.eq.${profileId}`);

  const { data: existing, error: existingError } = await admin
    .from('organizers')
    .select('id')
    .or(duplicateFilters.join(','))
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.id) {
    throw new Error('Ya existe una organizadora vinculada a esta postulacion o usuaria.');
  }

  const { error: insertError } = await admin.from('organizers').insert({
    partner_lead_id: leadId,
    user_id: userId,
    profile_id: profileId,
    status: 'pilot',
    source: 'full_chocolate',
    zone: normalizeText(lead.location_label),
    experience_level: normalizeText(lead.interest_level),
  });

  if (insertError) throw new Error(insertError.message);
}

export async function updateOrganizerBasics(organizerId: string, status: string, internalNotes: string) {
  await requireSuperAdminUserId();
  const id = normalizeText(organizerId);
  if (!id) throw new Error('Organizadora invalida.');

  const { error } = await getAdminSupabase()
    .from('organizers')
    .update({
      status: normalizeStatus(status),
      internal_notes: normalizeText(internalNotes),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateOrganizerFeatureFlag(userId: string, flagKey: string, enabled: boolean) {
  const enabledBy = await requireSuperAdminUserId();
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) throw new Error('La organizadora no tiene usuaria vinculada.');
  if (!ADMIN_FEATURE_FLAG_KEYS.includes(flagKey as AdminFeatureFlagKey)) {
    throw new Error('Flag invalida.');
  }

  const payload = {
    user_id: normalizedUserId,
    [flagKey]: enabled,
    enabled_by: enabledBy,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getAdminSupabase()
    .from('admin_feature_flags')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}
