export interface ProfileRequestBody {
  user: string;
  username: string;
  level_id: number | null;
  player_position: number[];
  phone?: string | null;
}

export interface UserProfileUpdate {
  username: string;
  level_id: number;
  player_position: number[];
  phone?: string | null;
}

export interface UserProfilePosition {
  id: number;
  name: string;
}

export interface UserProfileData {
  id?: number;
  user?: string;
  username?: string | null;
  level_id?: number | null;
  level?: string | null;
  onboarding_step?: number | null;
  is_profile_complete?: boolean | null;
  player_position?: UserProfilePosition[];
}
