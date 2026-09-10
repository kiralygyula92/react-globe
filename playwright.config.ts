/**
 * End-to-end tests drive the demo app. Headless Chromium rasterises in software,
 * so nothing here is a performance assertion — these are correctness tests that
 * happen to need a GPU context. Serial, because software WebGL is heavy.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 },
        deviceScaleFactor: 1,
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter demo dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
