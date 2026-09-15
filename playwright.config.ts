/**
 * End-to-end tests drive the playground page of the docs site, served by `astro dev` so the
 * library runs as a development build (its development warnings are part of what is tested).
 * Headless Chromium rasterises in software, so nothing here is a performance assertion —
 * these are correctness tests that happen to need a GPU context. Serial, because software
 * WebGL is heavy. Run `pnpm build` first: the docs site consumes the built library.
 */

import { defineConfig, devices } from '@playwright/test';

/** A dedicated port, so an unrelated server on a common port is never mistaken for the docs. */
const PORT = Number(process.env.E2E_PORT ?? 4400);

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 1100 },
        deviceScaleFactor: 1,
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: {
    // --ignore-lock lets the suite run beside a `pnpm docs:dev` session. ASTRO_DEV_BACKGROUND keeps
    // Astro in the foreground when it thinks an automated agent launched it; Playwright owns the process.
    command: `pnpm --filter docs exec astro dev --port ${PORT} --ignore-lock`,
    env: { ASTRO_DEV_BACKGROUND: '1' },
    url: `http://localhost:${PORT}/react-globe/demos/playground/`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
