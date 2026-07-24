import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /rock, paper, scissors v2\.2/i })).toBeVisible();
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__?.snapshot()?.counts.rock))
    .toBe(15);
}

test('starts a live meadow and moves the Rock swarm', async ({ page }) => {
  await startGame(page);
  const before = await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.swarmCenter.x);
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.swarmCenter.x);
  expect(after).toBeGreaterThan(before + 20);
});

test('dashes from a fresh Space press without adding a top HUD label and resets cleanly', async ({
  page,
}) => {
  await startGame(page);
  await page.keyboard.down('d');
  await page.keyboard.press('Space');
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.dash.phase))
    .not.toBe('ready');
  await expect(page.getByLabel('Dash status')).toHaveCount(0);
  await page.keyboard.up('d');
  await page.keyboard.press('r');
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.dash.phase))
    .toBe('ready');
});

test('shows shrine requirements and selects an eligible faction', async ({ page }) => {
  await startGame(page);
  const shrine = page.getByLabel('Triad Shrine');
  await expect(shrine).toContainText('Need 4 recruited units');
  await page.keyboard.press('e');
  await expect(shrine).toContainText('Selected Paper');
  await page.keyboard.down('f');
  await page.waitForTimeout(250);
  await page.keyboard.up('f');
  expect(await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.shrine.channelProgressMs)).toBe(
    0,
  );
});

test('pauses time and restarts cleanly', async ({ page }) => {
  await startGame(page);
  await page.waitForTimeout(350);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  const pausedAt = await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs)).toBe(pausedAt);
  await page.keyboard.press('r');
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.elapsedMs))
    .toBeLessThan(150);
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeHidden();
});

test('shows victory and can play again', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    window.__RPS_TEST__!.killFaction('paper');
    window.__RPS_TEST__!.killFaction('scissors');
  });
  await expect(page.getByRole('heading', { name: /meadow conquered/i })).toBeVisible();
  await page.getByRole('button', { name: /play again/i }).click();
  await expect
    .poll(() => page.evaluate(() => window.__RPS_TEST__!.snapshot()!.counts.paper))
    .toBe(12);
});

test('shows defeat only after every Rock is gone', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__RPS_TEST__!.killFaction('rock'));
  await expect(page.getByRole('heading', { name: /rock swarm is gone/i })).toBeVisible();
});
