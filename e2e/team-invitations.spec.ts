import type { Browser, Page } from '@playwright/test';
import { expect, signIn, test, type TeamInvitationScenario } from './support/teamInvitations.fixture';

async function newPage(
  browser: Browser,
  viewport: { width: number; height: number } = { width: 1280, height: 900 }
) {
  const context = await browser.newContext({ viewport });
  return { context, page: await context.newPage() };
}

async function inviteFromTeamPage(page: Page, scenario: TeamInvitationScenario) {
  await page.goto(`/equipo/${scenario.team.slug}`);
  await page.getByRole('button', { name: 'Convocar jugadoras' }).click();
  await page
    .getByLabel('Buscar jugadoras por username o email')
    .fill(`@${scenario.player.username}`);
  await page
    .getByRole('button', { name: new RegExp(`@${scenario.player.username}`) })
    .click();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/teams/${scenario.team.id}/invitations`) &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Confirmar convocatoria' }).click();
  expect((await responsePromise).status()).toBe(201);
  await expect(
    page.getByText(`Convocatoria enviada a @${scenario.player.username}`)
  ).toBeVisible();
}

async function invitationCard(page: Page, teamName: string) {
  const card = page.locator('article').filter({ hasText: teamName });
  await expect(card).toBeVisible();
  return card;
}

test('convocatoria nominada: capitana convoca y jugadora acepta en mobile', async ({
  browser,
  teamScenario,
}) => {
  const captain = await newPage(browser, { width: 390, height: 844 });
  await signIn(captain.page, teamScenario.captain, `/equipo/${teamScenario.team.slug}`);
  await inviteFromTeamPage(captain.page, teamScenario);

  await captain.page.goto('/convocatorias');
  await expect(captain.page.getByText('Aún no tienes convocatorias')).toBeVisible();
  await expect(
    captain.page.locator('[aria-label$="convocatorias pendientes"]:visible')
  ).toHaveCount(0);
  const captainPendingCount = await captain.page.evaluate(async () => {
    const response = await fetch('/api/team-invitations/pending-count');
    return (await response.json()) as { count?: number };
  });
  expect(captainPendingCount.count).toBe(0);
  await captain.context.close();

  const player = await newPage(browser, { width: 390, height: 844 });
  await signIn(player.page, teamScenario.player, '/convocatorias');
  await player.page.goto('/convocatorias');
  const card = await invitationCard(player.page, teamScenario.team.name);
  await expect(card.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(player.page.locator('[aria-label="1 convocatorias pendientes"]:visible')).toBeVisible();

  await card.getByRole('button', { name: 'Aceptar', exact: true }).click();
  const responsePromise = player.page.waitForResponse(
    (response) =>
      response.url().includes('/api/team-invitations/') &&
      response.url().endsWith('/respond') &&
      response.request().method() === 'POST'
  );
  await player.page.getByRole('button', { name: 'Sí, aceptar' }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(card.getByText('Aceptada', { exact: true })).toBeVisible();
  await expect(player.page.locator('[aria-label$="convocatorias pendientes"]:visible')).toHaveCount(0);

  await expect.poll(() => teamScenario.membershipCount(teamScenario.player)).toBe(1);
  await expect.poll(async () => (await teamScenario.invitationFor(teamScenario.player))?.status).toBe(
    'accepted'
  );

  const acceptedInvitation = await teamScenario.invitationFor(teamScenario.player);
  const repeatedResponseStatus = await player.page.evaluate(async (invitationId) => {
    const response = await fetch(`/api/team-invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'accepted' }),
    });
    return response.status;
  }, acceptedInvitation?.id);
  expect(repeatedResponseStatus).toBe(200);
  await expect.poll(() => teamScenario.membershipCount(teamScenario.player)).toBe(1);

  await player.page.goto('/profile#mis-equipos');
  await expect(player.page.getByText(teamScenario.team.name, { exact: true })).toBeVisible();
  await player.page.goto(`/equipo/${teamScenario.team.slug}`);
  await expect(player.page.getByText(`@${teamScenario.player.username}`, { exact: true })).toBeVisible();
  await player.context.close();
});

test('rechazar conserva historial y no crea membresía', async ({ browser, teamScenario }) => {
  await teamScenario.seedInvitation();
  const player = await newPage(browser);
  await signIn(player.page, teamScenario.player, '/convocatorias');
  await player.page.goto('/convocatorias');
  const card = await invitationCard(player.page, teamScenario.team.name);
  await card.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await player.page.getByRole('button', { name: 'Sí, rechazar' }).click();
  await expect(card.getByText('Rechazada', { exact: true })).toBeVisible();
  await expect.poll(() => teamScenario.membershipCount(teamScenario.player)).toBe(0);
  await expect.poll(async () => (await teamScenario.invitationFor(teamScenario.player))?.status).toBe(
    'rejected'
  );
  await player.context.close();

  const captain = await newPage(browser);
  await signIn(captain.page, teamScenario.captain, `/equipo/${teamScenario.team.slug}`);
  await captain.page.goto(`/equipo/${teamScenario.team.slug}`);
  const invitationRow = captain.page.locator('li').filter({ hasText: `@${teamScenario.player.username}` });
  await expect(invitationRow).toContainText('Rechazada');
  await captain.context.close();
});

test('capitana cancela una convocatoria pendiente y la jugadora la ve en historial', async ({
  browser,
  teamScenario,
}) => {
  await teamScenario.seedInvitation();
  const captain = await newPage(browser);
  await signIn(captain.page, teamScenario.captain, `/equipo/${teamScenario.team.slug}`);
  await captain.page.goto(`/equipo/${teamScenario.team.slug}`);
  const invitationRow = captain.page.locator('li').filter({ hasText: `@${teamScenario.player.username}` });
  captain.page.once('dialog', (dialog) => dialog.accept());
  await invitationRow.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(invitationRow).toContainText('Cancelada');
  await expect.poll(async () => (await teamScenario.invitationFor(teamScenario.player))?.status).toBe(
    'cancelled'
  );
  await captain.context.close();

  const player = await newPage(browser);
  await signIn(player.page, teamScenario.player, '/convocatorias');
  await player.page.goto('/convocatorias');
  const card = await invitationCard(player.page, teamScenario.team.name);
  await expect(card.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Aceptar', exact: true })).toHaveCount(0);
  await player.context.close();
});

test('enlace general conserva el retorno y exige aceptación explícita', async ({
  browser,
  teamScenario,
}) => {
  const visitor = await newPage(browser, { width: 390, height: 844 });
  const invitationPath = `/teams/invite/${teamScenario.team.invitationToken}`;
  await visitor.page.goto(invitationPath);
  await expect(
    visitor.page.getByRole('heading', {
      name: `${teamScenario.team.name} te invita a su equipo`,
      exact: true,
    })
  ).toBeVisible();
  await expect(visitor.page.getByText('No te incorporaremos automáticamente.')).toBeVisible();

  await visitor.page.getByRole('link', { name: 'Crear cuenta' }).click();
  await expect(visitor.page).toHaveURL(/\/signUp\?next=/);
  await visitor.page.goBack();
  await visitor.page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await expect(visitor.page).toHaveURL(/\/login\?next=/);
  await signIn(visitor.page, teamScenario.player, invitationPath, { navigate: false });
  await visitor.page.waitForURL(/\/convocatorias\?invitation=\d+/);

  await expect.poll(() => teamScenario.membershipCount(teamScenario.player)).toBe(0);
  const pendingInvitation = await teamScenario.invitationFor(teamScenario.player);
  expect(pendingInvitation?.status).toBe('pending');

  const card = await invitationCard(visitor.page, teamScenario.team.name);
  await card.getByRole('button', { name: 'Aceptar', exact: true }).click();
  await visitor.page.getByRole('button', { name: 'Sí, aceptar' }).click();
  await expect(card.getByText('Aceptada', { exact: true })).toBeVisible();
  await expect.poll(() => teamScenario.membershipCount(teamScenario.player)).toBe(1);

  await visitor.page.goto(invitationPath);
  await expect(visitor.page.getByText('Ya formas parte de este equipo.')).toBeVisible();
  await visitor.context.close();
});

test('regenerar enlace invalida el anterior y activa el nuevo', async ({
  browser,
  teamScenario,
}) => {
  const captain = await newPage(browser);
  await signIn(captain.page, teamScenario.captain, `/equipo/${teamScenario.team.slug}`);
  await captain.page.goto(`/equipo/${teamScenario.team.slug}`);

  captain.page.once('dialog', (dialog) => dialog.accept());
  const regenerationResponse = captain.page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/teams/${teamScenario.team.id}/invitation-link`) &&
      response.request().method() === 'POST'
  );
  await captain.page.getByRole('button', { name: 'Regenerar', exact: true }).click();
  expect((await regenerationResponse).status()).toBe(200);
  await expect(
    captain.page.getByText('Se creó un nuevo enlace. El anterior ya no funciona.')
  ).toBeVisible();
  const newLink = await captain.page.getByLabel('Enlace general de invitación').inputValue();
  expect(newLink).not.toContain(teamScenario.team.invitationToken);
  await captain.context.close();

  const visitor = await newPage(browser);
  await visitor.page.goto(`/teams/invite/${teamScenario.team.invitationToken}`);
  await expect(visitor.page.getByText('Este enlace ya no está disponible')).toBeVisible();
  await visitor.page.goto(newLink);
  await expect(
    visitor.page.getByRole('heading', {
      name: `${teamScenario.team.name} te invita a su equipo`,
      exact: true,
    })
  ).toBeVisible();
  await visitor.context.close();
});

test('API rechaza manipulación de equipo e invitación y bloquea open redirect', async ({
  browser,
  teamScenario,
}) => {
  const invitation = await teamScenario.seedInvitation();
  const outsider = await newPage(browser);
  await signIn(outsider.page, teamScenario.outsider, '/');

  const inviteStatus = await outsider.page.evaluate(
    async ({ teamId, candidateUserId }) => {
      const response = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateUserId }),
      });
      return response.status;
    },
    { teamId: teamScenario.team.id, candidateUserId: teamScenario.player.id }
  );
  expect(inviteStatus).toBe(403);

  const responseStatus = await outsider.page.evaluate(async (invitationId) => {
    const response = await fetch(`/api/team-invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'accepted' }),
    });
    return response.status;
  }, invitation.id);
  // The response endpoint deliberately hides invitations owned by another user.
  expect(responseStatus).toBe(404);
  expect((await teamScenario.invitationFor(teamScenario.player))?.status).toBe('pending');
  expect(await teamScenario.membershipCount(teamScenario.player)).toBe(0);
  await outsider.context.close();

  const redirectCheck = await newPage(browser);
  await redirectCheck.page.goto('/login?next=https%3A%2F%2Fevil.example%2Fsteal');
  await signIn(redirectCheck.page, teamScenario.outsider, '/', { navigate: false });
  expect(new URL(redirectCheck.page.url()).hostname).not.toBe('evil.example');
  await redirectCheck.context.close();
});
