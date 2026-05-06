import { expect, test } from '@playwright/test';

test('home loads and shows decode heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#decode-heading')).toBeVisible();
  await expect(page.locator('#hex')).toBeVisible();
});

test('invalid hex shows validation error', async ({ page }) => {
  await page.goto('/');
  const hex = page.locator('#hex');
  await hex.fill('4c 47 zz 01');
  await hex.press('Control+Enter');
  await expect(page.locator('#err')).toContainText(/invalid hex/i);
});

test('sample hex populates output and decode stats', async ({ page }) => {
  await page.goto('/');
  const hex = page.locator('#hex');
  await hex.fill('4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee');
  await hex.press('Control+Enter');
  await expect(page.locator('#decode-ok')).toContainText(/Plotted/i);
  await expect(page.locator('#decode-stats')).toContainText(/packet/i);
});

test('theme toggle updates aria-checked radio state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#theme-system')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#theme-dark').click();
  await expect(page.locator('#theme-dark')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#theme-system')).toHaveAttribute('aria-checked', 'false');
  await page.locator('#theme-light').click();
  await expect(page.locator('#theme-light')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#theme-dark')).toHaveAttribute('aria-checked', 'false');
});
