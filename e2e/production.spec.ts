import { expect, test } from '@playwright/test';

test('production build loads and starts without test-only hooks', async ({ page }) => {
  await page.goto('.');
  await expect(page.getByRole('heading', { name: 'Rock Paper Scissors 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  for (const [group, card] of [
    ['Starting faction', 'Rock'],
    ['Difficulty', 'Normal'],
    ['Game mode', 'Last Faction Standing'],
    ['Map', 'Meadow'],
  ] as const)
    await page
      .getByRole('group', { name: group })
      .getByRole('button', { name: new RegExp(`^${card}`, 'i') })
      .click();
  await page.getByRole('button', { name: 'Play match' }).click();
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByLabel('Match status')).toContainText('Rocks');
  expect(await page.evaluate(() => window.__RPS_TEST__)).toBeUndefined();
});
