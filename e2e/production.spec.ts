import { expect, test } from '@playwright/test';

test('production build loads and starts without test-only hooks', async ({ page }) => {
  await page.goto('.');
  await expect(page.getByRole('heading', { name: /rock, paper, scissors v2\.2/i })).toBeVisible();
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByLabel('Match status')).toContainText('Rocks');
  expect(await page.evaluate(() => window.__RPS_TEST__)).toBeUndefined();
});
