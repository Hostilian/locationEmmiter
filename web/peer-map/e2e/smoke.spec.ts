import { expect, test } from '@playwright/test';

test('home loads and shows Location Emitter heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h2', { hasText: 'Location Emitter' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'Connect BLE' })).toBeVisible();
});

test('ble connection toggle works', async ({ page }) => {
  await page.goto('/');
  const bleBtn = page.locator('button', { hasText: 'Connect BLE' });
  await bleBtn.click();
  await expect(page.locator('button', { hasText: 'Disconnect BLE' })).toBeVisible();
  
  // click again to disconnect
  await page.locator('button', { hasText: 'Disconnect BLE' }).click();
  await expect(page.locator('button', { hasText: 'Connect BLE' })).toBeVisible();
});

test('demo button populates active peers', async ({ page }) => {
  await page.goto('/');
  const demoBtn = page.locator('button', { hasText: '✨ Demo' });
  await demoBtn.click();
  
  // It should spawn a device list panel
  await expect(page.locator('h3', { hasText: 'Active Peers' })).toBeVisible();
  
  // Wait for at least one peer to be added
  await expect(page.locator('.font-mono.text-sm').first()).toBeVisible();
});
