// src/modules/teams/model/types.ts
export type CreateTeamBody = {
  name?: string;
  imageUrl?: string | null;
  avatarPath?: string | null;
  instagramUsername?: string | null;
  tiktokUsername?: string | null;
  idempotencyKey?: string | null;
};

export type TeamMemberRole = 'captain' | 'player';

export type TeamMemberStatus = 'active' | 'removed' | 'left';

export type TeamInvitationDeliveryMethod = 'username' | 'email' | 'link';

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
};

export type TeamInvitationRow = {
  id: number;
  team_id: number;
  invited_by_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  invitee_username: string | null;
  delivery_method: TeamInvitationDeliveryMethod;
  status: TeamInvitationStatus;
  invitation_token: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  responded_at: string | null;
  cancelled_at: string | null;
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

export type TeamMembershipSummary = {
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joined_at: string | null;
  team: TeamRow;
};

export type TeamInvitationSummary = TeamInvitationRow & {
  team?: Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url'> | null;
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
  role: TeamMemberRole;
  joined_at: string | null;
};

export type PublicTeamProfile = {
  team: Omit<TeamRow, 'invitation_token' | 'created_by_user_id' | 'deleted_at'>;
  members: PublicTeamMember[];
};
