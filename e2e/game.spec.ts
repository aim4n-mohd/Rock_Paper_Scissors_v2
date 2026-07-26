import { expect, test, type Page } from '@playwright/test';

interface Setup {
  faction?: 'Rock' | 'Paper' | 'Scissors';
  difficulty?: 'Casual' | 'Normal' | 'Chaos';
  mode?: 'Last Faction Standing' | 'Blitz';
  map?: 'Meadow' | 'Forest' | 'Marsh';
}

async function startGame(page: Page, setup: Setup = {}) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'rps2:player-preferences',
      JSON.stringify({ version: 1, settings: {}, tutorialCompleted: true }),
    );
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rock Paper Scissors 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('group', { name: 'Starting faction' })
    .getByRole('button', { name: new RegExp(`^${setup.faction ?? 'Rock'}`, 'i') })
    .click();
  await page
    .getByRole('group', { name: 'Difficulty' })
    .getByRole('button', { name: new RegExp(`^${setup.difficulty ?? 'Normal'}`, 'i') })
    .click();
  await page
    .getByRole('group', { name: 'Game mode' })
    .getByRole('button', { name: new RegExp(`^${setup.mode ?? 'Last Faction Standing'}`, 'i') })
    .click();
  await page
    .getByRole('group', { name: 'Map' })
    .getByRole('button', { name: new RegExp(`^${setup.map ?? 'Meadow'}`, 'i') })
    .click();
  await page.getByRole('button', { name: 'Play match' }).click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__?.snapshot()?.mapId))
    .toBe((setup.map ?? 'Meadow').toLowerCase());
}

test('landing, setup, first tutorial skip, and match form one clean flow', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByText('Build your swarm. Hunt your prey. Become what hunts you.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play match' })).toBeDisabled();
  for (const [group, card] of [
    ['Starting faction', 'Paper'],
    ['Difficulty', 'Normal'],
    ['Game mode', 'Last Faction Standing'],
    ['Map', 'Meadow'],
  ] as const)
    await page
      .getByRole('group', { name: group })
      .getByRole('button', { name: new RegExp(`^${card}`, 'i') })
      .click();
  await page.getByRole('button', { name: 'Play match' }).click();
  await expect(page.getByRole('heading', { name: 'Learn the hunt' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('rps2:player-preferences')!).tutorialCompleted,
    ),
  ).toBe(true);
});

test('moves and dashes a live selected swarm', async ({ page }) => {
  await startGame(page, { faction: 'Paper', map: 'Forest' });
  const before = await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.swarmCenter.x);
  await page.keyboard.down('d');
  try {
    await expect
      .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.swarmCenter.x), {
        timeout: 3000,
      })
      .toBeGreaterThan(before + 20);
    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.dash.phase))
      .not.toBe('ready');
  } finally {
    await page.keyboard.up('d');
  }
  await expect(page.getByLabel('Dash status')).toHaveCount(0);
});

test('shows shrine requirements and supports keyboard and pointer selection', async ({ page }) => {
  await startGame(page);
  const shrine = page.getByLabel('Triad Shrine');
  await expect(shrine).toContainText('Need 4 recruited units');
  await expect(shrine.getByRole('button', { name: 'Rock' })).toBeDisabled();
  await page.keyboard.press('e');
  await expect(shrine).toContainText('Selected Paper');
  await shrine.getByRole('button', { name: 'Scissors' }).click();
  await expect(shrine).toContainText('Selected Scissors');
});

test('pause and nested screens freeze time until resume', async ({ page }) => {
  await startGame(page);
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  const pausedAt = await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs)).toBe(pausedAt);
  await page.getByRole('button', { name: 'Back to Pause' }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs))
    .toBeGreaterThan(pausedAt);
});

test('settings apply and persist while the match remains mounted', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('slider', { name: 'Minimap opacity' }).fill('0.4');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('rps2:player-preferences')!).settings.minimapOpacity,
    ),
  ).toBe(0.4);
  await expect(page.locator('.game-canvas canvas')).toHaveCount(1);
});

test('victory shows authoritative results, writes a record, and replays', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    window.__RPS_TEST__!.killFaction('paper');
    window.__RPS_TEST__!.killFaction('scissors');
  });
  const results = page.getByRole('dialog', { name: 'victory results' });
  await expect(results.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(results.getByText('Final score')).toBeVisible();
  await expect(results.getByText('New record!')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('rps2:local-records')))
    .not.toBeNull();
  await results.getByRole('button', { name: 'Play Again' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.counts.paper))
    .toBe(12);
  expect(await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.score.current)).toBe(0);
});

test('defeat can return to setup without retaining stale match UI', async ({ page }) => {
  await startGame(page, { difficulty: 'Chaos', mode: 'Blitz', map: 'Marsh' });
  await page.evaluate(() => window.__RPS_TEST__!.killFaction('rock'));
  const results = page.getByRole('dialog', { name: 'defeat results' });
  await expect(results.getByRole('heading', { name: 'Defeat' })).toBeVisible();
  await results.getByRole('button', { name: 'Change Setup' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your match' })).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Marsh/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('quit destroys the match and restores the autoplay landing page', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit to Main Menu' }).click();
  await expect(page.getByRole('heading', { name: 'Rock Paper Scissors 2' })).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveCount(0);
  await expect(page.getByTestId('landing-background')).toBeVisible();
});
