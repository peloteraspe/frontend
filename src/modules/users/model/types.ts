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
