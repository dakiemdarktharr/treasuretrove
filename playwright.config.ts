import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
