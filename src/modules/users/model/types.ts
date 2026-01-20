export interface ProfileRequestBody {
  user: string;
  username: string;
  level_id: number;
  player_position: number[];
}

export interface UserProfileUpdate {
  username: string;
  level_id: number;
  player_position: number[];
}
