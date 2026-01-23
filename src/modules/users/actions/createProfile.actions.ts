'use server';

import { createProfile } from '@modules/users/api/profile.server';

export type CreateProfilePayload = {
  user: string;
  username: string;
  level_id: number;
  player_position: number[];
};

export async function createProfileAction(payload: CreateProfilePayload) {
  return createProfile(payload);
}
