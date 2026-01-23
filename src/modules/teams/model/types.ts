// src/modules/teams/model/types.ts
export type CreateTeamBody = {
  name?: string;
  memberIds?: string[];
  invites?: string[];
  imageUrl?: string | null;
};
