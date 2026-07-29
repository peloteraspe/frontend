import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page, test as base } from '@playwright/test';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

type ScenarioUser = {
  id: string;
  email: string;
  username: string;
  password: string;
};

type ScenarioTeam = {
  id: number;
  name: string;
  slug: string;
  invitationToken: string;
};

type InvitationRecord = {
  id: number;
  status: string;
};

export type TeamInvitationScenario = {
  admin: SupabaseClient;
  captain: ScenarioUser;
  player: ScenarioUser;
  outsider: ScenarioUser;
  team: ScenarioTeam;
  seedInvitation: (user?: ScenarioUser) => Promise<InvitationRecord>;
  invitationFor: (user: ScenarioUser) => Promise<{ id: number; status: string } | null>;
  membershipCount: (user: ScenarioUser) => Promise<number>;
  cleanup: () => Promise<void>;
};

function requiredEnvironment(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required E2E environment variable: ${name}`);
  return value;
}

function linkedProjectRef() {
  const configured = String(process.env.E2E_SUPABASE_PROJECT_REF || '').trim();
  if (configured) return configured;

  try {
    return readFileSync(resolve('supabase/.temp/project-ref'), 'utf8').trim();
  } catch {
    return '';
  }
}

function createAdminClient() {
  if (process.env.E2E_ALLOW_REMOTE_SUPABASE !== 'true') {
    throw new Error(
      'Remote E2E writes are disabled. Set E2E_ALLOW_REMOTE_SUPABASE=true for a development/test project.'
    );
  }

  const url = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const expectedRef = linkedProjectRef();
  const actualRef = new URL(url).hostname.split('.')[0];

  if (!expectedRef || actualRef !== expectedRef) {
    throw new Error(
      `E2E Supabase project mismatch: expected ${expectedRef || 'an explicit project ref'}, received ${actualRef}.`
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createAuthUser(
  admin: SupabaseClient,
  input: { email: string; password: string; fullName: string }
) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) throw error || new Error('Could not create E2E auth user.');
  return data.user;
}

async function createScenario(): Promise<TeamInvitationScenario> {
  const admin = createAdminClient();
  const tag = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`.slice(-12);
  const password = `E2e!${randomBytes(15).toString('base64url')}`;
  const createdUsers: User[] = [];
  let teamId: number | null = null;

  const identities = {
    captain: {
      email: `codex.captain.${tag}@example.test`,
      username: `e2ecap${tag}`,
      fullName: 'Capitana E2E',
    },
    player: {
      email: `codex.player.${tag}@example.test`,
      username: `e2eplayer${tag}`,
      fullName: 'Jugadora E2E',
    },
    outsider: {
      email: `codex.outsider.${tag}@example.test`,
      username: `e2eoutside${tag}`,
      fullName: 'Jugadora Externa E2E',
    },
  };

  async function cleanupPartial() {
    const userIds = createdUsers.map((user) => user.id);

    if (teamId) {
      await admin.from('product_analytics_events').delete().contains('payload', { team_id: teamId });
      await admin.from('team_invitation').delete().eq('team_id', teamId);
      await admin.from('team_member').delete().eq('team_id', teamId);
      await admin.from('team').delete().eq('id', teamId);
    }
    if (userIds.length) {
      await admin.from('product_analytics_events').delete().in('user_id', userIds);
      await admin.from('product_analytics_events').delete().in('ref_user_id', userIds);
      await admin.from('profile').delete().in('user', userIds);
    }
    for (const user of [...createdUsers].reverse()) {
      await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }
  }

  try {
    const captainAuth = await createAuthUser(admin, {
      email: identities.captain.email,
      password,
      fullName: identities.captain.fullName,
    });
    createdUsers.push(captainAuth);
    const playerAuth = await createAuthUser(admin, {
      email: identities.player.email,
      password,
      fullName: identities.player.fullName,
    });
    createdUsers.push(playerAuth);
    const outsiderAuth = await createAuthUser(admin, {
      email: identities.outsider.email,
      password,
      fullName: identities.outsider.fullName,
    });
    createdUsers.push(outsiderAuth);

    const captain: ScenarioUser = {
      id: captainAuth.id,
      email: identities.captain.email,
      username: identities.captain.username,
      password,
    };
    const player: ScenarioUser = {
      id: playerAuth.id,
      email: identities.player.email,
      username: identities.player.username,
      password,
    };
    const outsider: ScenarioUser = {
      id: outsiderAuth.id,
      email: identities.outsider.email,
      username: identities.outsider.username,
      password,
    };

    const { error: profileError } = await admin.from('profile').insert([
      { user: captain.id, username: captain.username, onboarding_step: 3, is_profile_complete: true },
      { user: player.id, username: player.username, onboarding_step: 3, is_profile_complete: true },
      { user: outsider.id, username: outsider.username, onboarding_step: 3, is_profile_complete: true },
    ]);
    if (profileError) throw profileError;

    const teamName = `Equipo Convocatorias ${tag}`;
    const teamSlug = `e2e-invitations-${tag}`;
    const { data: createdTeam, error: teamError } = await admin
      .from('team')
      .insert({ name: teamName, slug: teamSlug, created_by_user_id: captain.id })
      .select('id, name, slug, invitation_token')
      .single();
    if (teamError || !createdTeam) throw teamError || new Error('Could not create E2E team.');
    teamId = Number(createdTeam.id);

    const { error: membershipError } = await admin.from('team_member').insert({
      team_id: teamId,
      user_id: captain.id,
      role: 'captain',
      status: 'active',
      joined_at: new Date().toISOString(),
    });
    if (membershipError) throw membershipError;

    const team: ScenarioTeam = {
      id: teamId,
      name: String(createdTeam.name),
      slug: String(createdTeam.slug),
      invitationToken: String(createdTeam.invitation_token),
    };

    const scenario: TeamInvitationScenario = {
      admin,
      captain,
      player,
      outsider,
      team,
      async seedInvitation(user = player) {
        const { data, error } = await admin
          .from('team_invitation')
          .insert({
            team_id: team.id,
            invited_by_user_id: captain.id,
            invitee_user_id: user.id,
            invitee_email: user.email,
            invitee_username: user.username,
            delivery_method: 'username',
            source: 'captain_search',
          })
          .select('id, status')
          .single();
        if (error || !data) throw error || new Error('Could not seed E2E invitation.');
        return { id: Number(data.id), status: String(data.status) };
      },
      async invitationFor(user) {
        const { data, error } = await admin
          .from('team_invitation')
          .select('id, status')
          .eq('team_id', team.id)
          .eq('invitee_user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        return data ? { id: Number(data.id), status: String(data.status) } : null;
      },
      async membershipCount(user) {
        const { count, error } = await admin
          .from('team_member')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (error) throw error;
        return count || 0;
      },
      cleanup: cleanupPartial,
    };

    return scenario;
  } catch (error) {
    await cleanupPartial();
    throw error;
  }
}

export async function signIn(
  page: Page,
  user: ScenarioUser,
  nextPath: string,
  options: { navigate?: boolean } = {}
) {
  if (options.navigate !== false) {
    await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  await page.locator('input[name="email"]').waitFor();
  await page.waitForLoadState('networkidle');
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await expect(page.locator('input[name="email"]')).toHaveValue(user.email);
  await page.getByRole('button', { name: 'Iniciar sesion', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45_000 });
}

export const test = base.extend<{ teamScenario: TeamInvitationScenario }>({
  teamScenario: async ({}, use) => {
    const scenario = await createScenario();
    try {
      await use(scenario);
    } finally {
      await scenario.cleanup();
    }
  },
});

export { expect };
