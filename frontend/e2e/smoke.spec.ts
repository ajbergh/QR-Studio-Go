import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads and core UI elements are present.
 */

test.describe('App loads', () => {
  test('renders the QR Studio page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/QR Studio/i);
  });

  test('QR preview canvas is visible', async ({ page }) => {
    await page.goto('/');
    // The QR preview renders inside a <canvas> element
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test('controls panel is visible', async ({ page }) => {
    await page.goto('/');
    // Tabs navigation should be visible (Content / Design / Colors / Templates)
    const tabs = page.locator('[role="tablist"], [data-testid="controls-tabs"]').first();
    await expect(tabs).toBeVisible({ timeout: 5_000 });
  });
});
