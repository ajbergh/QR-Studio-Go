import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe('remediated QR Studio workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scan-ready output' })).toBeVisible();
  });

  test('creates a URL QR code that decodes to the normalized URL', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'BarcodeDetector coverage is Chromium-only.');
    await page.getByLabel('Website URL').fill('openai.com');
    await expect(page.locator('[data-testid="qr-preview"] canvas')).toBeVisible();

    const supported = await page.evaluate(() => 'BarcodeDetector' in window);
    test.skip(!supported, 'BarcodeDetector is unavailable in this browser build.');

    const decoded = await page.evaluate(async () => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="qr-preview"] canvas');
      if (!canvas) throw new Error('QR canvas not found');
      const Detector = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      const detector = new Detector({ formats: ['qr_code'] });
      const result = await detector.detect(canvas);
      return result[0]?.rawValue ?? '';
    });
    expect(decoded).toBe('https://openai.com');
  });

  test('exports a real PNG artifact', async ({ page }) => {
    await page.getByLabel('Website URL').fill('https://example.com/release-check');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export QR' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const bytes = await readFile(path!);
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  test('renders an uploaded logo without blanking the QR code', async ({ page }) => {
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.locator('input[type="file"][accept*="image/svg+xml"]').first().setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>'),
    });

    await expect.poll(() => page.locator('[data-testid="qr-preview"] canvas').evaluate(canvas => {
      const image = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
      let red = 0;
      let dark = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        const [r, g, b, a] = image.data.slice(i, i + 4);
        if (r > 200 && g < 80 && b < 80 && a > 200) red++;
        if (r < 100 && g < 100 && b < 100 && a > 200) dark++;
      }
      return red > 100 && dark > 100;
    })).toBe(true);
  });

  test('persists a saved design across reload', async ({ page }) => {
    await page.getByRole('tab', { name: 'Library' }).click();
    await page.getByLabel('Design name').fill('Persistence Test');
    await page.getByRole('button', { name: 'Save design' }).click();
    await expect(page.getByText('Persistence Test', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('tab', { name: 'Library' }).click();
    await expect(page.getByText('Persistence Test', { exact: true })).toBeVisible();
  });

  test('rejects invalid coordinates before export', async ({ page }) => {
    await page.getByRole('tab', { name: 'Content' }).click();
    await page.getByRole('tab', { name: 'Location' }).click();
    await page.getByLabel('Latitude').fill('100');
    await page.getByLabel('Longitude').fill('-200');
    await expect(page.getByRole('alert')).toContainText('Latitude must be between -90 and 90');
    await expect(page.getByRole('button', { name: 'Export QR' })).toBeDisabled();
  });
});
