/**
 * PPDS v1.0 §11 conformance checks against the built docs site.
 *
 *   node scripts/ppds/conformance.mjs [--dist apps/docs/dist] [--gate phase3] [--report file.md]
 *
 * Builds nothing: run the docs build first. Serves the build with a host-like
 * server (scripts/ppds/serve.mjs) so links, twins and redirects are checked over
 * HTTP. Each check reports pass, fail, n/a (with the EXCEPTIONS entry that makes it
 * so) or pending (with the phase that delivers it). `--gate` exits non-zero when a
 * check that gate requires is not passing.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'node-html-parser';
import { parse as parseYaml } from 'yaml';
import {
  ARCHETYPES,
  CONTENT_DIR,
  FOOTER_COLUMNS,
  LIFECYCLE_BADGES,
  ROOT,
  SECTIONS,
  TAXONOMY,
  badgesFor,
  flattenNav,
  groupOf,
  isGroup,
  legacyRows,
  loadModel,
  navPages,
  navWithReference,
  pageSpec,
  referenceEntries,
  siteRedirects,
  symbolPath,
  titlesWithReference,
  twinPath,
} from './model.mjs';
import { startServer } from './serve.mjs';

/* ------------------------------------------------------------------- options */

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const DIST = resolve(ROOT, arg('dist', 'apps/docs/dist'));
const GATE = arg('gate', null);
const REPORT = arg('report', null);

/**
 * Checks each gate requires, cumulatively: a later gate keeps every earlier one.
 * Phase 3 (brief §3): structural checks 1–2, 5–9, 18–23. Phase 4: + 10–12. Phase 5: + 3–4
 * and no content placeholders left. Phase 6 / all: every check.
 */
const PHASE3 = [1, 2, 5, 6, 7, 8, 9, 18, 19, 20, 21, 22, 23];
const PHASE4 = [...PHASE3, 10, 11, 12];
const PHASE5 = [...PHASE4, 3, 4];
const ALL = Array.from({ length: 26 }, (_, i) => i + 1);
const GATES = { phase3: PHASE3, phase4: PHASE4, phase5: PHASE5, phase6: ALL, all: ALL };
/** Gates that also require every authored placeholder to be gone. */
const CONTENT_GATES = new Set(['phase5', 'phase6', 'all']);

if (!existsSync(join(DIST, 'react-globe'))) {
  console.error(`no build at ${DIST} — run the docs build first`);
  process.exit(2);
}

/* -------------------------------------------------------------------- setup */

const model = loadModel();
const { config } = model;
/** The nav the site renders: nav.json plus the generated Reference children (N3). */
const nav = navWithReference(model.nav, config);
const titles = titlesWithReference(model.titles, config);
const references = new Map(referenceEntries(config).map((r) => [r.symbol, r]));
const plain = (text) => String(text ?? '').replace(/`([^`]+)`/g, '$1');
const schema = JSON.parse(readFileSync(join(ROOT, 'docs', 'ppds', 'plugin-site.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'ppds');

const pages = navPages(nav).map((entry) => {
  const spec = pageSpec(entry, config);
  if (entry.node.symbol) {
    const reference = references.get(entry.node.symbol);
    return { entry, node: entry.node, pathname: entry.node.pathname, spec, reference, description: plain(reference?.strings.symbolDescription), frontmatter: null, body: '' };
  }
  const raw = readFileSync(join(CONTENT_DIR, spec.file), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  return {
    entry,
    node: entry.node,
    pathname: entry.node.pathname,
    spec,
    frontmatter: match ? parseYaml(match[1]) : null,
    body: match ? match[2] : raw,
  };
}).map((page) => ({ ...page, description: page.reference ? page.description : page.frontmatter?.description }));
const authored = pages.filter((p) => !p.reference);

const { server, origin } = await startServer(DIST);
const SITE_ORIGINS = new Set([origin]);

/** Fetch without following redirects. */
async function get(path) {
  const res = await fetch(new URL(path, origin), { redirect: 'manual' });
  const body = res.status === 200 ? await res.text() : '';
  return { status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type') ?? '', body };
}

/** Fetch following up to five redirects; returns the final status. */
async function resolveUrl(path) {
  let current = path;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(new URL(current, origin), { redirect: 'manual', method: 'GET' });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), new URL(current, origin)).pathname;
      continue;
    }
    return { status: res.status, final: current };
  }
  return { status: 310, final: current };
}

const html = new Map();
for (const page of pages) {
  const res = await get(page.pathname);
  html.set(page.pathname, { res, doc: res.status === 200 ? parse(res.body) : null });
}

/** A site-absolute URL from the build (built with some DOCS_SITE_URL origin) as a local path. */
function localPath(href) {
  if (!href) return null;
  if (href.startsWith('/')) return href;
  try {
    const url = new URL(href);
    const siteUrl = new URL(process.env.DOCS_SITE_URL ?? 'http://localhost:4321');
    if (url.origin === siteUrl.origin || SITE_ORIGINS.has(url.origin)) return url.pathname + url.search;
  } catch {
    /* relative or malformed */
  }
  return null;
}

/* ------------------------------------------------------------------- checks */

const results = [];
const check = async (id, name, fn) => {
  try {
    const out = await fn();
    results.push({ id, name, ...out });
  } catch (error) {
    results.push({ id, name, status: 'fail', details: [`check crashed: ${error.stack ?? error}`] });
  }
};
const verdict = (details, extra = {}) => ({ status: details.length ? 'fail' : 'pass', details, ...extra });
const text = (el) => (el ? el.text.replace(/\s+/g, ' ').trim() : '');
const articleOf = (doc) => doc.querySelector('main article');
const h2Texts = (doc) => articleOf(doc).querySelectorAll('h2').map(text);
const isSubsequence = (needle, hay) => {
  let i = 0;
  for (const h of hay) if (h === needle[i]) i++;
  return i === needle.length;
};

/* Structure */

await check(1, 'Every docs page resolves to exactly one archetype and contains all its required blocks', () => {
  const details = [];
  const capabilitySchema = ajv.getSchema('ppds#/$defs/capabilityFrontmatter');
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    const where = `${page.pathname} (${page.spec.archetype})`;
    if (!doc) {
      details.push(`${where}: not served`);
      continue;
    }
    const archetype = ARCHETYPES[page.spec.archetype];
    if (doc.querySelector('body')?.getAttribute('data-archetype') !== page.spec.archetype) details.push(`${where}: body data-archetype mismatch`);
    if (page.reference) {
      if (text(doc.querySelector('h1')) !== `${page.node.symbol} reference`) details.push(`${where}: H1 must be "${page.node.symbol} reference"`);
      if (!page.description) details.push(`${where}: no symbol description`);
    } else if (!page.frontmatter) details.push(`${where}: no frontmatter`);
    else {
      if (page.frontmatter.title !== titles[page.pathname]) details.push(`${where}: frontmatter title ≠ titles.json`);
      if (page.frontmatter.pluginId !== config.id) details.push(`${where}: pluginId ≠ ${config.id}`);
      if (page.spec.archetype === 'B') {
        if (!capabilitySchema(page.frontmatter)) {
          details.push(...capabilitySchema.errors.map((e) => `${where}: frontmatter ${e.instancePath || '/'} ${e.message}`));
        }
        if (page.frontmatter.capabilityId !== page.node.capabilityId) details.push(`${where}: capabilityId ≠ nav`);
        if (page.frontmatter.group !== groupOf(page.entry)) details.push(`${where}: group ≠ nav subheader`);
        if ((page.frontmatter.plan ?? null) !== (page.node.plan ?? null)) details.push(`${where}: plan ≠ nav`);
        if ((page.frontmatter.lifecycle ?? null) !== (page.node.lifecycle ?? null)) details.push(`${where}: lifecycle ≠ nav`);
      }
    }
    const required = archetype.h2.map((h) => h.replace('{name}', config.name));
    const present = h2Texts(doc);
    for (const h of required) if (!present.includes(h)) details.push(`${where}: missing ## ${h}`);
    if (archetype.h2AnyOf && !archetype.h2AnyOf.some((h) => present.includes(h))) details.push(`${where}: needs one of ## ${archetype.h2AnyOf.join(' / ')}`);
    for (const block of archetype.layout) {
      if (!doc.querySelector(`[data-block="${block}"]`)) details.push(`${where}: missing block ${block}`);
    }
    if (page.spec.archetype === 'A' && text(doc.querySelector('h1')) !== `${config.name} — Overview`) details.push(`${where}: H1 must be "${config.name} — Overview"`);
    if (page.spec.archetype === 'C') {
      const groups = doc.querySelectorAll('[data-feature-group]').map((g) => g.getAttribute('data-feature-group'));
      const expected = flattenNav(nav).filter((e) => e.node.subheader && e.parents.some((p) => p.pathname.endsWith('/features-group'))).map((e) => e.node.subheader);
      if (JSON.stringify(groups) !== JSON.stringify(expected)) details.push(`${where}: feature groups ${JSON.stringify(groups)} ≠ nav ${JSON.stringify(expected)}`);
    }
    if (!doc.querySelector('[data-action="edit"]') || !doc.querySelector('[data-action="feedback"]')) details.push(`${where}: page footer actions incomplete`);
  }
  return verdict(details);
});

await check(2, 'Exactly one H1 per page; heading levels never skip', () => {
  const details = [];
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    const headings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6').map((h) => Number(h.tagName[1]));
    const h1s = headings.filter((l) => l === 1).length;
    if (h1s !== 1) details.push(`${page.pathname}: ${h1s} H1 elements`);
    let previous = 0;
    for (const level of headings) {
      if (level > previous + 1) details.push(`${page.pathname}: h${previous || '—'} → h${level} skips a level`);
      previous = level;
    }
  }
  return verdict(details);
});

await check(3, 'Capability pages contain ## Basics, ## Customization, ## Limitations, ## API in that order', () => {
  const details = [];
  const order = ['Basics', 'Customization', 'Limitations', 'API'];
  for (const page of pages.filter((p) => p.spec.archetype === 'B')) {
    const { doc } = html.get(page.pathname);
    if (doc && !isSubsequence(order, h2Texts(doc).filter((h) => order.includes(h)))) details.push(`${page.pathname}: ${JSON.stringify(h2Texts(doc))}`);
  }
  return verdict(details);
});

await check(4, 'No capability page exceeds 8 H2s or ~2,000 words', () => {
  const details = [];
  for (const page of pages.filter((p) => p.spec.archetype === 'B')) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    const h2 = h2Texts(doc).length;
    const words = text(articleOf(doc)).split(' ').filter(Boolean).length;
    if (h2 > 8 || words > 2000) details.push(`${page.pathname}: ${h2} H2, ${words} words`);
  }
  return verdict(details);
});

const enabledSections = SECTIONS.filter((s) => config.sections.some((c) => c.id === s.id && c.enabled !== false));

await check(5, 'Sidebar section order matches §5', () => {
  const expected = enabledSections.map((s) => s.id);
  const details = [];
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    const rendered = doc.querySelectorAll('[data-block="sidebar"] [data-nav-section]').map((s) => s.getAttribute('data-nav-section'));
    if (JSON.stringify(rendered) !== JSON.stringify(expected)) details.push(`${page.pathname}: ${JSON.stringify(rendered)}`);
  }
  return verdict(details);
});

await check(6, 'Sidebar, features index and feature matrix render from the same nav data', () => {
  const details = [];
  const index = pages.find((p) => p.spec.archetype === 'C');
  const indexDoc = html.get(index.pathname).doc;
  const cards = indexDoc.querySelectorAll('[data-feature-card]').map((a) => a.getAttribute('data-feature-card'));
  const sidebarLinks = indexDoc
    .querySelectorAll('[data-nav-section="features"] [data-nav-group] [data-nav-link]')
    .map((a) => a.getAttribute('data-nav-link'));
  const navCapabilities = flattenNav(nav).filter((e) => e.node.capabilityId).map((e) => e.node.pathname);
  if (JSON.stringify(cards) !== JSON.stringify(navCapabilities)) details.push(`features index cards ≠ nav.json capability order`);
  if (JSON.stringify(sidebarLinks) !== JSON.stringify(navCapabilities)) details.push(`sidebar capability links ≠ nav.json capability order`);
  const tiered = config.tiers.length > 1;
  return verdict(details, tiered ? {} : { note: 'Feature matrix: n/a — untiered (EXCEPTIONS E-01).' });
});

await check(7, 'Nav depth ≤ 3', () => {
  const details = flattenNav(nav).filter((e) => e.depth > 3).map((e) => `nav.json ${e.node.pathname} at depth ${e.depth}`);
  const doc = html.get(pages[0].pathname).doc;
  const renderedDepth = Math.max(...doc.querySelectorAll('[data-block="sidebar"] ul[data-nav-depth]').map((u) => Number(u.getAttribute('data-nav-depth'))));
  if (renderedDepth > 3) details.push(`rendered sidebar depth ${renderedDepth}`);
  return verdict(details);
});

await check(8, "Every nav node's pathname resolves to a real page or is an explicit virtual group", async () => {
  const details = [];
  for (const { node } of flattenNav(nav)) {
    if (isGroup(node)) continue;
    const res = await get(node.pathname);
    if (res.status !== 200) details.push(`${node.pathname}: HTTP ${res.status}`);
  }
  return verdict(details);
});

await check(9, 'Every badge on a rendered page traces back to a nav-node plan/lifecycle', () => {
  const details = [];
  const byPath = new Map(flattenNav(nav).map((e) => [e.node.pathname, e.node]));
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    for (const badge of doc.querySelectorAll('.badge')) {
      const kind = badge.getAttribute('data-badge-kind');
      const value = badge.getAttribute('data-badge-value');
      const node = byPath.get(badge.getAttribute('data-badge-for'));
      const traced = node && ((kind === 'plan' && node.plan === value) || (kind === 'lifecycle' && node.lifecycle === value));
      if (!traced) details.push(`${page.pathname}: badge "${text(badge)}" has no nav source`);
    }
    for (const link of doc.querySelectorAll('[data-block="sidebar"] [data-nav-link]')) {
      const node = byPath.get(link.getAttribute('data-nav-link'));
      const expected = badgesFor(node, config).map((b) => `${b.kind}:${b.value}`).sort();
      const rendered = link.querySelectorAll('.badge').map((b) => `${b.getAttribute('data-badge-kind')}:${b.getAttribute('data-badge-value')}`).sort();
      if (JSON.stringify(expected) !== JSON.stringify(rendered)) details.push(`${page.pathname}: sidebar ${node.pathname} badges ${rendered} ≠ nav ${expected}`);
    }
  }
  const count = pages.reduce((n, p) => n + (html.get(p.pathname).doc?.querySelectorAll('.badge').length ?? 0), 0);
  return verdict(details, { note: `${count} badge(s) rendered.` });
});

/* Reference */

const referenceDir = join(CONTENT_DIR, 'reference');
const schemaFiles = existsSync(referenceDir) ? readdirSync(referenceDir).filter((f) => f.endsWith('.schema.json')) : [];

await check(10, 'No reference/*.schema.json hand-edited since the last generation (checksum)', () => {
  if (schemaFiles.length === 0) return { status: 'pending', details: [], note: 'No generated reference yet (Phase 4).' };
  const manifestFile = join(referenceDir, 'checksums.json');
  if (!existsSync(manifestFile)) return verdict(['reference/checksums.json missing']);
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const details = [];
  for (const file of schemaFiles) {
    const sum = createHash('sha256').update(readFileSync(join(referenceDir, file))).digest('hex');
    if (manifest[file] !== sum) details.push(`${file}: checksum mismatch`);
  }
  return verdict(details);
});

await check(11, 'Every symbols entry has a reference page', async () => {
  const details = [];
  const symbols = new Set(authored.flatMap((p) => p.frontmatter?.symbols ?? []));
  for (const symbol of symbols) {
    const hasSchema = schemaFiles.includes(`${symbol}.schema.json`);
    const res = await get(symbolPath(symbol, config));
    if (!hasSchema || res.status !== 200) details.push(`${symbol}: ${hasSchema ? '' : 'no schema; '}${symbolPath(symbol, config)} HTTP ${res.status}`);
  }
  return verdict(details, { note: `${symbols.size} distinct symbol(s) declared across pages; ${schemaFiles.length} generated.` });
});

await check(12, "Every reference page's usedBy is non-empty or marked internal", () => {
  if (schemaFiles.length === 0) return { status: 'pending', details: [], note: 'No generated reference yet (Phase 4).' };
  const details = [];
  for (const file of schemaFiles) {
    const data = JSON.parse(readFileSync(join(referenceDir, file), 'utf8'));
    if (!(data.usedBy?.length > 0) && data.internal !== true) details.push(`${file}: empty usedBy`);
  }
  return verdict(details);
});

/* Pricing */

const tiered = config.tiers.length > 1 || existsSync(join(CONTENT_DIR, 'pricing.json'));
for (const [id, name] of [
  [13, 'Every pricing-matrix row href resolves'],
  [14, 'Every capability with a non-free plan appears in the matrix'],
  [15, 'Every plan card has a distinct CTA verb'],
]) {
  await check(id, name, () =>
    tiered ? { status: 'fail', details: ['tiered plugin: pricing checks not implemented yet'] } : { status: 'na', details: [], note: 'Untiered (EXCEPTIONS E-01).' },
  );
}

/* Machine surface */

const llms = await get(`/${config.id}/llms.txt`);
const llmsEntries = [...llms.body.matchAll(/^- \[(.+?)\]\((.+?)\): (.*)$/gm)].map((m) => ({ title: m[1], url: m[2], description: m[3] }));

await check(16, 'llms.txt exists, lists every published docs page, and every entry resolves', async () => {
  if (llms.status !== 200) return verdict([`llms.txt HTTP ${llms.status}`]);
  const details = [];
  if (!llms.body.startsWith(`# ${config.name}\n`)) details.push('llms.txt must start with "# {Plugin}"');
  const listed = new Set(llmsEntries.map((e) => localPath(e.url)));
  for (const page of pages) if (!listed.has(twinPath(page.pathname, config))) details.push(`not listed: ${page.pathname}`);
  for (const entry of llmsEntries) {
    const path = localPath(entry.url);
    const res = path ? await get(path) : { status: 'external' };
    if (res.status !== 200) details.push(`entry ${entry.url}: HTTP ${res.status}`);
  }
  return verdict(details);
});

await check(17, 'Every docs URL + .md returns Markdown', async () => {
  const details = [];
  for (const page of pages) {
    const res = await get(twinPath(page.pathname, config));
    if (res.status !== 200) details.push(`${twinPath(page.pathname, config)}: HTTP ${res.status}`);
    else if (!res.type.startsWith('text/markdown') || !res.body.startsWith('# ')) details.push(`${twinPath(page.pathname, config)}: not Markdown`);
  }
  return verdict(details, { note: 'Generated reference is appended to twins in Phase 4.' });
});

await check(18, 'sitemap.xml covers both surfaces', async () => {
  const res = await get('/sitemap.xml');
  if (res.status !== 200) return verdict([`sitemap.xml HTTP ${res.status}`]);
  const locs = new Set([...res.body.matchAll(/<loc>(.+?)<\/loc>/g)].map((m) => localPath(m[1])));
  const details = pages.filter((p) => !locs.has(p.pathname)).map((p) => `missing ${p.pathname}`);
  return verdict(details, { note: 'Docs surface only: no marketing surface exists yet (EXCEPTIONS E-02).' });
});

/* Metadata */

const META = [
  ['name', 'description'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:type'],
  ['property', 'og:url'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
  ['name', 'theme-color'],
  ['name', 'viewport'],
  ['name', 'search:language'],
  ['name', 'search:version'],
  ['name', 'plugin:id'],
  ['name', 'plugin:categoryId'],
];

await check(19, 'Every page emits the full §7.6 meta set', async () => {
  const details = [];
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    if (!text(doc.querySelector('title'))) details.push(`${page.pathname}: <title> empty`);
    if (!doc.querySelector('link[rel="canonical"]')) details.push(`${page.pathname}: no canonical`);
    for (const [attr, key] of META) {
      const el = doc.querySelector(`meta[${attr}="${key}"]`);
      if (!el || el.getAttribute('content') === undefined) details.push(`${page.pathname}: missing ${key}`);
      else if (key !== 'plugin:categoryId' && !el.getAttribute('content')) details.push(`${page.pathname}: empty ${key}`);
    }
    const image = localPath(doc.querySelector('meta[property="og:image"]')?.getAttribute('content'));
    const res = image ? await get(image) : { status: 'none' };
    if (res.status !== 200 || !res.type.startsWith('image/png')) details.push(`${page.pathname}: og:image ${image} HTTP ${res.status}`);
  }
  return verdict(details, { note: 'plugin:categoryId is emitted empty: categoryId is null until a portfolio exists (EXCEPTIONS E-02).' });
});

await check(20, 'llms.txt description == meta description == H1 subtitle, per page', () => {
  const details = [];
  const byUrl = new Map(llmsEntries.map((e) => [localPath(e.url), e.description]));
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    if (!doc) continue;
    const meta = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    const subtitle = text(doc.querySelector('[data-block="subtitle"]'));
    const listed = byUrl.get(twinPath(page.pathname, config));
    if (!(meta === subtitle && subtitle === listed && listed === page.description)) {
      details.push(`${page.pathname}: meta=${JSON.stringify(meta)} subtitle=${JSON.stringify(subtitle)} llms=${JSON.stringify(listed)}`);
    }
  }
  return verdict(details);
});

await check(21, 'Every page has a canonical URL with trailing slash', () => {
  const details = [];
  for (const page of pages) {
    const { doc } = html.get(page.pathname);
    const href = doc?.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (!href) details.push(`${page.pathname}: none`);
    else if (!/^https?:\/\//.test(href) || !href.endsWith('/') || new URL(href).pathname !== page.pathname) details.push(`${page.pathname}: ${href}`);
  }
  return verdict(details);
});

/* Migration */

await check(22, 'Every legacy URL 301s', async () => {
  const details = [];
  const exempt = [];
  const installable = new Map(siteRedirects().map((r) => [r.from, r]));
  for (const row of legacyRows()) {
    const url = row.legacy_url;
    if (installable.has(url)) {
      const res = await get(url);
      const expected = installable.get(url).to;
      if (res.status !== 301 || res.location !== expected) details.push(`${url}: HTTP ${res.status} → ${res.location} (expected 301 → ${expected})`);
    } else if (/^https:\/\/github\.com\//.test(url)) exempt.push(`${url} — repository-hosted, stays live (E-03)`);
    else if (/ @ [0-9a-f]{7,}$/.test(url)) exempt.push(`${url} — never had a route (E-04)`);
    else if (/^https?:\/\/localhost[:/]/.test(url)) exempt.push(`${url} — local dev server only, never public (E-08)`);
    else details.push(`${url}: neither a site path nor covered by an exception`);
  }
  return verdict(details, { note: `${installable.size} redirect(s) verified over HTTP; ${exempt.length} exempt: ${exempt.join('; ')}` });
});

await check(23, 'No internal link 404s', async () => {
  const details = [];
  const seen = new Map();
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.html')) files.push(path);
    }
  };
  walk(DIST);
  for (const file of files) {
    const doc = parse(readFileSync(file, 'utf8'));
    const from = `/${relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '')}`;
    const refs = [
      ...doc.querySelectorAll('a[href]').map((a) => a.getAttribute('href')),
      ...doc.querySelectorAll('link[href]').map((l) => l.getAttribute('href')),
      ...doc.querySelectorAll('script[src], img[src]').map((s) => s.getAttribute('src')),
      ...doc.querySelectorAll('meta[content]').map((m) => m.getAttribute('content')).filter((c) => /^https?:\/\//.test(c)),
    ];
    for (const ref of refs) {
      if (!ref || ref.startsWith('#') || ref.startsWith('mailto:')) continue;
      const path = localPath(ref) ?? (/^[a-z]+:/i.test(ref) ? null : new URL(ref, new URL(from, origin)).pathname);
      if (!path) continue;
      const clean = path.split('#')[0];
      if (!seen.has(clean)) seen.set(clean, await resolveUrl(clean));
      const res = seen.get(clean);
      if (res.status !== 200) details.push(`${from} → ${clean}: HTTP ${res.status}`);
    }
  }
  return verdict([...new Set(details)], { note: `${seen.size} distinct internal target(s) across ${files.length} HTML file(s). External links are verified live in Phase 6.` });
});

await check(24, 'Old version docs still resolve', async () => {
  const details = [];
  for (const version of config.versions ?? []) {
    if (!version.href.startsWith('/')) continue;
    const res = await resolveUrl(version.href);
    if (res.status !== 200) details.push(`${version.label} ${version.href}: HTTP ${res.status}`);
  }
  return verdict(details, { note: `${(config.versions ?? []).length} version(s) declared; no previous major exists yet.` });
});

/* Portfolio consistency */

await check(25, 'Same section names, badge vocabulary, footer columns and taxonomy terms as the portfolio', () => {
  const details = [];
  for (const section of enabledSections) {
    const title = titles[`/${config.id}/${section.group}`];
    if (title !== section.name) details.push(`section ${section.id} titled "${title}", canonical "${section.name}"`);
  }
  for (const term of config.taxonomy) if (!TAXONOMY.includes(term)) details.push(`taxonomy term "${term}" not in the portfolio vocabulary`);
  for (const { node } of flattenNav(nav)) if (node.lifecycle && !LIFECYCLE_BADGES[node.lifecycle]) details.push(`lifecycle "${node.lifecycle}" not in the badge vocabulary`);
  const doc = html.get(pages[0].pathname).doc;
  const columns = doc.querySelectorAll('[data-footer-column]').map((c) => c.getAttribute('data-footer-column'));
  if (JSON.stringify(columns) !== JSON.stringify(FOOTER_COLUMNS)) details.push(`footer columns ${JSON.stringify(columns)}`);
  return verdict(details, { note: 'Single plugin: consistency is checked against the canonical vocabulary.' });
});

await check(26, 'Shared components are imported from one place, not forked per plugin', () => {
  const details = [];
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, out);
      else out.push(path);
    }
    return out;
  };
  const forked = walk(CONTENT_DIR).filter((f) => /\.(astro|vue|svelte)$/.test(f) || (/\.(tsx|jsx)$/.test(f) && !/[\\/]demo-[^\\/]+$/.test(f)));
  details.push(...forked.map((f) => `component inside plugin content: ${relative(ROOT, f)}`));
  const components = walk(join(ROOT, 'apps', 'docs', 'src')).filter((f) => f.endsWith('.astro')).map((f) => f.split(/[\\/]/).pop());
  const duplicates = components.filter((c, i) => components.indexOf(c) !== i);
  details.push(...duplicates.map((c) => `component defined twice: ${c}`));
  return verdict(details, { note: 'Metrics, testimonial and plan-card blocks do not exist yet (EXCEPTIONS E-01, E-02).' });
});

server.close();

/* ------------------------------------------------------------------- report */

const SYMBOL = { pass: 'PASS', fail: 'FAIL', na: 'N/A ', pending: 'PEND' };
const gateIds = GATE ? GATES[GATE] : null;
if (GATE && !gateIds) {
  console.error(`unknown gate ${GATE}; known: ${Object.keys(GATES).join(', ')}`);
  process.exit(2);
}

const todoDescriptions = authored.filter((p) => String(p.frontmatter?.description ?? '').startsWith('TODO')).length;
const todoComments = pages.reduce((n, p) => n + (p.body.match(/<!-- TODO/g)?.length ?? 0), 0);
const emptySections = pages.reduce((n, p) => n + (p.body.match(/^## .+\n(?=\s*(## |$))/gm)?.length ?? 0), 0);

const lines = [];
lines.push(`# PPDS v1.0 conformance — ${config.name}`, '');
lines.push(`Build: \`${relative(ROOT, DIST).replace(/\\/g, '/')}\` · ${pages.length} pages · ${new Date().toISOString().slice(0, 10)}${GATE ? ` · gate \`${GATE}\` (checks ${gateIds.join(', ')})` : ''}`, '');
lines.push('| # | Check | Result | Gate |', '|---|---|---|---|');
for (const r of results.sort((a, b) => a.id - b.id)) {
  lines.push(`| ${r.id} | ${r.name} | ${SYMBOL[r.status].trim()}${r.details.length ? ` (${r.details.length})` : ''} | ${gateIds?.includes(r.id) ? 'required' : ''} |`);
}
lines.push('', '## Details', '');
for (const r of results) {
  if (!r.details.length && !r.note) continue;
  lines.push(`### ${r.id}. ${r.name} — ${SYMBOL[r.status].trim()}`);
  if (r.note) lines.push('', r.note);
  if (r.details.length) {
    lines.push('');
    for (const d of r.details.slice(0, 25)) lines.push(`- ${d}`);
    if (r.details.length > 25) lines.push(`- … ${r.details.length - 25} more`);
  }
  lines.push('');
}
lines.push('## Content readiness (informational)', '');
lines.push(`- ${todoDescriptions} of ${authored.length} authored pages still have a TODO one-line description.`);
lines.push(`- ${todoComments} TODO authoring comments remain.`);
lines.push(`- ${emptySections} required headings are still empty.`);

const report = lines.join('\n');
console.log(report);
if (REPORT) {
  mkdirSync(dirname(resolve(ROOT, REPORT)), { recursive: true });
  writeFileSync(resolve(ROOT, REPORT), `${report}\n`);
}

if (gateIds) {
  const blocking = results.filter((r) => gateIds.includes(r.id) && r.status !== 'pass' && r.status !== 'na').map((r) => String(r.id));
  if (CONTENT_GATES.has(GATE) && todoDescriptions + todoComments + emptySections > 0) blocking.push('content readiness');
  console.log(blocking.length ? `\nGATE ${GATE}: FAILED — ${blocking.join(', ')}` : `\nGATE ${GATE}: PASSED`);
  process.exit(blocking.length ? 1 : 0);
}
