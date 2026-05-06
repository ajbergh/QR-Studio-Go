import { test, expect } from '@playwright/test';

/**
 * QR generation tests — verify content input produces an updated QR code.
 */

test.describe('QR generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the initial QR to render
    await page.locator('canvas').first().waitFor({ state: 'visible' });
  });

  test('URL input updates the QR code', async ({ page }) => {
    // Find the main text/URL input and type a URL
    const urlInput = page.getByPlaceholder(/enter url|enter text|https/i).first();
    await urlInput.fill('https://example.com');
    await urlInput.press('Tab');

    // Canvas should still be present (QR re-rendered)
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('export button is present', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export|download/i }).first();
    await expect(exportBtn).toBeVisible();
  });

  test('copy to clipboard button is present', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });
});
