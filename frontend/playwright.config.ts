import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for QR Studio E2E tests.
 *
 * Tests run against the Vite dev server (http://localhost:3000).
 * Start the dev server before running tests, or use `webServer` below to
 * let Playwright manage it automatically.
 *
 * Run tests:
 *   npm run test:e2e          — headless, all browsers
 *   npm run test:e2e:ui       — Playwright UI mode
 *   npm run test:e2e:headed   — headed Chrome
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /**
   * Automatically start the Vite dev server when running tests.
   * Remove or comment out this block if you prefer to start Vite manually.
   */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
