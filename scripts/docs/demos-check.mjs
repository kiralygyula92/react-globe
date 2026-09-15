/**
 * Opens every docs page that has live demos, scrolls each demo into view in a real
 * browser with software WebGL, and fails when a demo does not mount a canvas or the
 * page logs an error.
 *
 *   node scripts/docs/demos-check.mjs [--dist apps/docs/dist] [--report demos.md]
 *
 * Needs Playwright's Chromium (`npx playwright install chromium`).
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { ROOT } from './model.mjs';
import { startServer } from './serve.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const DIST = resolve(ROOT, arg('dist', 'apps/docs/dist'));
const REPORT = arg('report', null);

/** Errors that are expected by design: the error-handling demos load missing files on purpose. */
const EXPECTED = [/does-not-exist\.geojson/, /missing-capitals\.json/, /Failed to load resource: the server responded with a status of 404/];

function htmlPages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) htmlPages(path, out);
    else if (name === 'index.html' && readFileSync(path, 'utf8').includes('data-demo=')) out.push(path);
  }
  return out;
}

const pages = htmlPages(join(DIST, 'react-globe')).map((f) => `/${relative(DIST, dirname(f)).replace(/\\/g, '/')}/`);
const { server, origin } = await startServer(DIST);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });

const results = [];
for (const path of pages.sort()) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(origin + path, { waitUntil: 'load' });

  const figures = page.locator('figure[data-demo]');
  const count = await figures.count();
  const demos = [];
  for (let i = 0; i < count; i++) {
    const figure = figures.nth(i);
    const id = await figure.getAttribute('data-demo');
    await figure.scrollIntoViewIfNeeded();
    const expectsFailure = /error-handling/.test(id);
    // Demos that wait for the reader mark their start button; press it like a reader would.
    const stage = figure.locator('[data-demo-stage]');
    await stage
      .locator('canvas, [data-demo-activate], [role="status"], [role="alert"], [data-globe-fallback]')
      .first()
      .waitFor({ timeout: 60000 })
      .catch(() => {});
    const activate = stage.locator('[data-demo-activate]');
    if ((await activate.count()) > 0) await activate.first().click();
    let status = 'ok';
    try {
      if (expectsFailure) {
        await figure.locator('[data-demo-stage] [role="status"], [data-demo-stage] [role="alert"], [data-demo-stage] [data-globe-fallback]').first().waitFor({ timeout: 60000 });
      } else {
        await figure.locator('[data-demo-stage] canvas').first().waitFor({ timeout: 60000 });
      }
      const stageText = (await figure.locator('[data-demo-stage]').innerText()).trim();
      if (/could not start|missing from the build/.test(stageText)) status = `failed: ${stageText}`;
    } catch {
      status = expectsFailure ? 'failed: no error state' : 'failed: no canvas';
    }
    demos.push({ id, status });
  }
  await page.waitForTimeout(1500);
  const unexpected = errors.filter((e) => !EXPECTED.some((re) => re.test(e)));
  results.push({ path, demos, errors: unexpected });
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => r.errors.length || r.demos.some((d) => d.status !== 'ok'));
const lines = ['# Live demo check', '', `${results.length} pages · ${results.reduce((n, r) => n + r.demos.length, 0)} demos · ${failed.length} page(s) with problems`, '', '| Page | Demos | Result |', '|---|---|---|'];
for (const r of results) {
  const bad = r.demos.filter((d) => d.status !== 'ok');
  lines.push(`| \`${r.path}\` | ${r.demos.length} | ${bad.length || r.errors.length ? `FAIL — ${[...bad.map((d) => `${d.id}: ${d.status}`), ...r.errors.map((e) => `console: ${e.slice(0, 160)}`)].join('; ')}` : 'PASS'} |`);
}
const report = lines.join('\n');
console.log(report);
if (REPORT) {
  mkdirSync(dirname(resolve(ROOT, REPORT)), { recursive: true });
  writeFileSync(resolve(ROOT, REPORT), `${report}\n`);
}
process.exit(failed.length ? 1 : 0);
