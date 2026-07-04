export const ORGANIZER_STATUSES = ['pilot', 'active', 'paused', 'inactive'] as const;

export const ADMIN_FEATURE_FLAG_KEYS = [
  'can_create_events',
  'can_manage_own_events',
  'can_view_participants',
  'can_manage_payments',
  'can_scan_tickets',
  'can_manage_finances',
  'can_view_reports',
  'can_manage_organizers',
] as const;

export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number];
export type AdminFeatureFlagKey = (typeof ADMIN_FEATURE_FLAG_KEYS)[number];

export type AdminFeatureFlagsState = Record<AdminFeatureFlagKey, boolean> & {
  id: string | null;
  enabledBy: string | null;
  notes: string | null;
  updatedAt: string | null;
};

export type OrganizerListItem = {
  id: string;
  userId: string | null;
  profileId: number | null;
  partnerLeadId: number | null;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  status: OrganizerStatus;
  zone: string | null;
  experienceLevel: string | null;
  internalNotes: string | null;
  createdAt: string | null;
  flags: AdminFeatureFlagsState | null;
};

export type OrganizerOption = {
  id: string;
  displayName: string;
  status: OrganizerStatus;
  contactEmail: string | null;
  zone: string | null;
};

export type PartnerLeadListItem = {
  id: number;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  status: string;
  zone: string | null;
  experienceLevel: string | null;
  createdAt: string | null;
  userId: string | null;
  linkedOrganizerId: string | null;
};

export type OrganizersAdminData = {
  organizers: OrganizerListItem[];
  partnerLeads: PartnerLeadListItem[];
};
