// src/modules/teams/model/types.ts
export type CreateTeamBody = {
  name?: string;
  imageUrl?: string | null;
  avatarPath?: string | null;
  instagramUsername?: string | null;
  tiktokUsername?: string | null;
  idempotencyKey?: string | null;
  maxMembers?: number | null;
};

export type TeamMemberRole = 'captain' | 'player';

export type TeamMemberStatus = 'active' | 'removed' | 'left';

export type TeamInvitationDeliveryMethod = 'username' | 'email' | 'link';

export type TeamInvitationSource = 'captain_search' | 'team_link';

export type TeamInvitationEmailDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'not_applicable';

export type TeamInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type TeamRow = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  instagram_username: string | null;
  tiktok_username: string | null;
  created_by_user_id: string;
  invitation_token: string;
  is_active: boolean;
  deleted_at: string | null;
  max_members: number;
};

export type TeamSummaryRow = Omit<
  TeamRow,
  'invitation_token' | 'created_by_user_id' | 'deleted_at'
>;

export type TeamInvitationRow = {
  id: number;
  team_id: number;
  invited_by_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  invitee_username: string | null;
  delivery_method: TeamInvitationDeliveryMethod;
  source: TeamInvitationSource;
  status: TeamInvitationStatus;
  invitation_token: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string;
  responded_at: string | null;
  cancelled_at: string | null;
  email_sent_at: string | null;
  email_delivery_status: TeamInvitationEmailDeliveryStatus;
  provider_message_id: string | null;
  accepted_member_id: number | null;
};

export type CreateTeamInvitationInput = {
  teamId: number;
  deliveryMethod: TeamInvitationDeliveryMethod;
  inviteeUserId?: string | null;
  inviteeEmail?: string | null;
  inviteeUsername?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type TeamInvitationCandidateStatus = 'available' | 'member' | 'pending';

export type TeamInvitationCandidate = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: TeamInvitationCandidateStatus;
};

export type TeamMembershipSummary = {
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joined_at: string | null;
  isFeatured?: boolean;
  team: TeamSummaryRow;
};

export type TeamInvitationSummary = TeamInvitationRow & {
  team?: Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url'> | null;
};

export type TeamInvitationCard = {
  id: number;
  status: TeamInvitationStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  captainUsername: string | null;
  team: Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url'>;
};

export type CaptainTeamInvitationCard = {
  id: number;
  username: string | null;
  maskedEmail: string | null;
  status: TeamInvitationStatus;
  emailDeliveryStatus: TeamInvitationEmailDeliveryStatus;
  createdAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
};

export type TeamInvitationLinkPreview = {
  teamId: number;
  teamName: string;
  teamSlug: string;
  teamAvatarUrl: string | null;
};

export type TeamMemberRow = {
  id: number;
  team_id: number;
  user_id: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  created_at: string;
  updated_at: string;
  joined_at: string | null;
  ended_at: string | null;
};

export type PublicTeamMember = {
  id: number;
  username: string | null;
  avatar_url: string | null;
  role: TeamMemberRole;
  joined_at: string | null;
};

export type TeamEventSummary = {
  registrationId: number;
  state: 'approved';
  participantCount: number;
  event: {
    id: number;
    title: string;
    startTime: string | null;
    endTime: string | null;
    locationText: string | null;
  };
};

export type PublicTeamProfile = {
  team: TeamSummaryRow;
  members: PublicTeamMember[];
  events: TeamEventSummary[];
};
