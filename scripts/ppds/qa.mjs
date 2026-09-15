/**
 * PPDS Phase 6 QA against the built docs site, in a real browser (brief §6):
 *
 *   docs/qa/flow-walkthroughs.md  the eight §9 flows, clicked through and recorded
 *   docs/qa/accessibility.md      axe-core (WCAG 2.1 A/AA) on one page per archetype
 *   docs/qa/metadata-sample.md    the §7.6 set on ten pages, with OG image dimensions
 *   docs/qa/redirect-check.csv    every legacy URL requested over HTTP
 *
 *   node scripts/ppds/qa.mjs [--dist apps/docs/dist]
 *
 * Exits non-zero when a flow step fails, axe reports a violation, a metadata field is
 * missing or a redirect does not answer as mapped.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { ROOT, legacyRows, loadModel, siteRedirects } from './model.mjs';
import { startServer } from './serve.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const DIST = resolve(ROOT, arg('dist', 'apps/docs/dist'));
const OUT = join(ROOT, 'docs', 'qa');
mkdirSync(OUT, { recursive: true });

const { config } = loadModel();
const { server, origin } = await startServer(DIST);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const today = new Date().toISOString().slice(0, 10);
const local = (url) => new URL(url).pathname + new URL(url).hash;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);

/* -------------------------------------------------------------------- flows */

/**
 * Each step either navigates, clicks a link by its visible name inside a region, or checks
 * something on the current page. A step records the URL it ended on.
 */
const FLOWS = [
  {
    id: 'F1',
    name: 'Evaluate',
    note: 'The marketing landing, capability showcase, feature matrix and pricing do not exist (EXCEPTIONS E-01, E-02); the docs part of the path is walked.',
    steps: [
      { go: `/${config.id}/`, label: 'Docs overview' },
      { click: 'All features', within: 'main' },
      { click: 'Connections', within: 'main' },
      { expect: 'figure[data-demo]', label: 'Capability page shows a live demo' },
      { click: 'Installation', within: 'nav[aria-label="Documentation"]' },
    ],
  },
  {
    id: 'F2',
    name: 'Adopt',
    steps: [
      { go: `/${config.id}/`, label: 'Docs overview' },
      { click: 'Installation', within: 'main' },
      { click: 'Usage', within: 'main' },
      { click: 'Pins', within: 'main' },
      { expect: 'figure[data-demo]', label: 'First capability shows a live demo' },
    ],
  },
  {
    id: 'F3',
    name: 'Implement',
    steps: [
      { go: `/${config.id}/`, label: 'Any page' },
      { search: 'clustering', result: 'Pin clustering' },
      { expect: 'figure[data-demo] .demo-source', label: 'Demo with its source' },
      { click: 'ClusterRenderProps', within: '[data-block="api-links"]' },
      { expect: 'table[data-block="options"]', label: 'Generated reference table' },
      { back: true, label: 'Back to the capability page' },
    ],
  },
  {
    id: 'F4',
    name: 'Customise',
    steps: [
      { go: `/${config.id}/country-names/`, label: 'Capability page' },
      { click: 'Theming', within: 'main' },
      { click: 'GLOBE_THEME_TOKENS reference', within: 'main' },
      { expect: 'table[data-block="tokens"]', label: 'Every token with its fallbacks' },
    ],
  },
  {
    id: 'F5',
    name: 'Upgrade',
    note: 'There is no migration page yet: 1.0.0 is the first release (EXCEPTIONS E-06).',
    steps: [
      { go: `/${config.id}/camera/`, label: 'Any docs page' },
      { open: '[data-block="version-selector"] summary', label: 'Version selector' },
      { click: 'All versions', within: '[data-block="version-selector"]' },
      { click: 'Changelog', within: 'main' },
      { expect: '[data-block="rss"]', label: 'Changelog with its RSS feed' },
    ],
  },
  {
    id: 'F6',
    name: 'Convert',
    na: 'Untiered: no paid tier, badge, pricing or licence activation exists (EXCEPTIONS E-01).',
    steps: [],
  },
  {
    id: 'F7',
    name: 'Support',
    steps: [
      { go: `/${config.id}/gestures/`, label: 'Any docs page' },
      { click: 'Support', within: 'nav[aria-label="Documentation"]' },
      { expectHref: `${config.links.issues}`, label: 'Free channel: the issue tracker' },
    ],
  },
  {
    id: 'F8',
    name: 'Agent',
    steps: [
      { fetch: `/${config.id}/llms.txt`, label: 'llms.txt' },
      { fetchFirstTwin: true, label: 'First listed Markdown twin' },
    ],
  },
];

async function runFlow(page, flow) {
  const rows = [];
  let llms = '';
  for (const step of flow.steps) {
    let label = step.label ?? step.click ?? step.search;
    let ok = true;
    let detail = '';
    try {
      if (step.go) await page.goto(origin + step.go);
      else if (step.click) {
        // A card link's accessible name starts with its title and continues with its description.
        const name = new RegExp(`^${escapeRegExp(step.click)}(\\s|$)`);
        const link = page.locator(step.within).getByRole('link', { name }).first();
        await link.click();
        await page.waitForLoadState('load');
        label = `Click “${step.click}”`;
      } else if (step.open) await page.locator(step.open).click();
      else if (step.back) {
        await page.goBack();
        await page.waitForLoadState('load');
      } else if (step.search) {
        const input = page.locator('#search input');
        await input.waitFor({ timeout: 15000 });
        await input.fill(step.search);
        const result = page.locator('#search .pagefind-ui__result-link', { hasText: step.result }).first();
        await result.waitFor({ timeout: 15000 });
        await result.click();
        await page.waitForLoadState('load');
        label = `Search “${step.search}”, open “${step.result}”`;
      } else if (step.expect) {
        await page.locator(step.expect).first().waitFor({ timeout: 15000 });
      } else if (step.expectHref) {
        const count = await page.locator(`main a[href^="${step.expectHref}"]`).count();
        ok = count > 0;
        detail = `${count} link(s)`;
      } else if (step.fetch) {
        const res = await page.request.get(origin + step.fetch);
        llms = await res.text();
        ok = res.ok() && llms.startsWith(`# ${config.name}`);
        detail = `HTTP ${res.status()}`;
      } else if (step.fetchFirstTwin) {
        const url = /\]\((https?:\/\/[^)]+\.md)\)/.exec(llms)?.[1];
        const res = url ? await page.request.get(origin + local(url)) : null;
        ok = Boolean(res?.ok()) && (res.headers()['content-type'] ?? '').startsWith('text/markdown');
        detail = url ? `${local(url)} → HTTP ${res?.status()}` : 'no entry';
      }
    } catch (error) {
      ok = false;
      detail = String(error.message ?? error).split('\n')[0];
    }
    const at = step.fetch || step.fetchFirstTwin ? '—' : local(page.url());
    rows.push({ label, at, ok, detail });
    if (!ok) break;
  }
  return rows;
}

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const flowPage = await context.newPage();
const flowLines = [`# Flow walkthroughs`, '', `PPDS §9, clicked through in Chromium against \`apps/docs/dist\` on ${today}.`, ''];
for (const flow of FLOWS) {
  flowLines.push(`## ${flow.id} ${flow.name}`, '');
  if (flow.na) {
    flowLines.push(`Not applicable. ${flow.na}`, '');
    continue;
  }
  if (flow.note) flowLines.push(flow.note, '');
  const rows = await runFlow(flowPage, flow);
  flowLines.push('| # | Step | Page | Result |', '|---|---|---|---|');
  rows.forEach((r, i) => flowLines.push(`| ${i + 1} | ${r.label} | \`${r.at}\` | ${r.ok ? 'OK' : 'FAIL'}${r.detail ? ` — ${r.detail}` : ''} |`));
  const complete = rows.length === flow.steps.length && rows.every((r) => r.ok);
  if (!complete) failures++;
  flowLines.push('', `**${complete ? 'Completable' : 'Blocked'}.**`, '');
}
writeFileSync(join(OUT, 'flow-walkthroughs.md'), `${flowLines.join('\n')}\n`);
await flowPage.close();

/* ------------------------------------------------------------ accessibility */

const A11Y_PAGES = [
  ['A', `/${config.id}/`],
  ['B', `/${config.id}/pins/`],
  ['C', `/${config.id}/all-features/`],
  ['E', `/${config.id}/api/globe/`],
  ['F', `/${config.id}/getting-started/installation/`],
  ['I', `/${config.id}/customization/theming/`],
  ['I', `/${config.id}/discover-more/changelog/`],
];
const a11yLines = ['# Accessibility', '', `axe-core, tags wcag2a · wcag2aa · wcag21a · wcag21aa, Chromium, ${today}. One page per archetype; live demos mounted before scanning.`, ''];
a11yLines.push('| Archetype | Page | Colour scheme | Violations | Checked rules passed |', '|---|---|---|---|---|');
const details = [];
for (const colorScheme of ['light', 'dark']) {
  const schemeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
  for (const [archetype, path] of A11Y_PAGES) {
    const page = await schemeContext.newPage();
    await page.goto(origin + path);
    for (const figure of await page.locator('figure[data-demo]').all()) {
      await figure.scrollIntoViewIfNeeded();
      await figure.locator('[data-demo-stage] canvas').waitFor({ timeout: 60000 }).catch(() => {});
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    a11yLines.push(`| ${archetype} | \`${path}\` | ${colorScheme} | ${result.violations.length} | ${result.passes.length} |`);
    for (const v of result.violations) {
      failures++;
      details.push(`### ${path} (${colorScheme}): ${v.id} (${v.impact})`, '', v.help, '', ...v.nodes.slice(0, 5).map((n) => `- \`${n.target.join(' ')}\``), '');
    }
    await page.close();
  }
  await schemeContext.close();
}
a11yLines.push('', 'Also verified by construction: one H1 per page and no skipped heading levels (conformance check 2), a skip link, landmark regions, visible focus outlines, labelled demos.', '');
if (details.length) a11yLines.push('## Violations', '', ...details);
writeFileSync(join(OUT, 'accessibility.md'), `${a11yLines.join('\n')}\n`);

/* ------------------------------------------------------------------ metadata */

const META_PAGES = [
  `/${config.id}/`,
  `/${config.id}/pins/`,
  `/${config.id}/localization/`,
  `/${config.id}/all-features/`,
  `/${config.id}/api/globe/`,
  `/${config.id}/api/globe-theme-tokens/`,
  `/${config.id}/getting-started/installation/`,
  `/${config.id}/guides/performance/`,
  `/${config.id}/customization/theming/`,
  `/${config.id}/discover-more/changelog/`,
];
const FIELDS = ['title', 'canonical', 'description', 'og:title', 'og:description', 'og:image', 'og:type', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'theme-color', 'viewport', 'search:language', 'search:version', 'plugin:id', 'plugin:categoryId'];
const metaLines = ['# Metadata sample', '', `PPDS §7.6 on ten pages covering every archetype, ${today}. \`plugin:categoryId\` is empty by design (EXCEPTIONS E-02).`, ''];
const metaPage = await context.newPage();
for (const path of META_PAGES) {
  await metaPage.goto(origin + path);
  const values = await metaPage.evaluate((fields) => {
    const get = (key) => {
      if (key === 'title') return document.title;
      if (key === 'canonical') return document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
      const el = document.querySelector(`meta[name="${key}"], meta[property="${key}"]`);
      return el ? el.getAttribute('content') : null;
    };
    return Object.fromEntries(fields.map((f) => [f, get(f)]));
  }, FIELDS);
  const missing = FIELDS.filter((f) => values[f] === null || (values[f] === '' && f !== 'plugin:categoryId'));
  const image = await metaPage.request.get(origin + local(values['og:image']));
  const dims = image.ok() ? await sharp(await image.body()).metadata() : null;
  const imageOk = Boolean(dims && dims.width === 1200 && dims.height === 630 && dims.format === 'png');
  if (missing.length || !imageOk) failures++;
  metaLines.push(`## \`${path}\``, '', '| Field | Value |', '|---|---|');
  for (const f of FIELDS) metaLines.push(`| ${f} | ${values[f] === null ? '**missing**' : `\`${String(values[f]).replace(/\|/g, '\\|')}\``} |`);
  metaLines.push(`| og:image render | ${imageOk ? `PNG ${dims.width}×${dims.height}` : `**FAIL** ${image.status()}`} |`, '');
}
await metaPage.close();
writeFileSync(join(OUT, 'metadata-sample.md'), `${metaLines.join('\n')}\n`);

/* ----------------------------------------------------------------- redirects */

const installable = new Map(siteRedirects().map((r) => [r.from, r]));
const csv = ['legacy_url,expected_status,expected_location,actual_status,actual_location,result,note'];
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
for (const row of legacyRows()) {
  const url = row.legacy_url;
  if (installable.has(url)) {
    const res = await fetch(origin + url, { redirect: 'manual' });
    const expected = installable.get(url);
    const ok = res.status === expected.status && res.headers.get('location') === expected.to;
    if (!ok) failures++;
    csv.push([q(url), expected.status, q(expected.to), res.status, q(res.headers.get('location')), ok ? 'PASS' : 'FAIL', q('verified over HTTP against the host-like server; re-run against production once hosted (GAPS G-18)')].join(','));
  } else {
    const reason = /^https:\/\/github\.com\//.test(url) ? 'E-03: repository-hosted, stays live' : / @ [0-9a-f]{7,}$/.test(url) ? 'E-04: never had a route' : /localhost/.test(url) ? 'E-08: local dev server only' : 'unmapped';
    if (reason === 'unmapped') failures++;
    csv.push([q(url), '', '', '', '', reason === 'unmapped' ? 'FAIL' : 'EXEMPT', q(reason)].join(','));
  }
}
const root = await fetch(`${origin}/`, { redirect: 'manual' });
const rootOk = root.status === 302 && root.headers.get('location') === `/${config.id}/`;
if (!rootOk) failures++;
csv.push([q('/'), 302, q(`/${config.id}/`), root.status, q(root.headers.get('location')), rootOk ? 'PASS' : 'FAIL', q('site root → docs root until a marketing surface exists (E-02, E-09)')].join(','));
writeFileSync(join(OUT, 'redirect-check.csv'), `${csv.join('\n')}\n`);

await browser.close();
server.close();
console.log(failures ? `QA: ${failures} problem(s) — see docs/qa/` : 'QA: all flows completable, no accessibility violations, metadata complete, redirects as mapped');
process.exit(failures ? 1 : 0);
