import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4200',
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --port 4200 --host 127.0.0.1 --no-open',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
