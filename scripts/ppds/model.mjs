/**
 * The PPDS v1.0 content model for one plugin, as plain functions over its data files.
 *
 * Shared by the scaffold generator, the docs site and the conformance script, so
 * all three agree on where a page's file lives, which archetype it is, and which
 * blocks that archetype requires. Nothing here reads Markdown bodies.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN_ID = 'react-globe';

/**
 * The repository root: the nearest ancestor holding this plugin's content. Found by
 * walking up rather than fixed relative to this file, because a bundler (the docs
 * build) moves this module into its output directory.
 */
function findRoot() {
  const marker = join('content', PLUGIN_ID, 'plugin.config.json');
  for (const start of [dirname(fileURLToPath(import.meta.url)), process.cwd()]) {
    let dir = start;
    for (;;) {
      if (existsSync(join(dir, marker))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error(`[ppds] no ${marker} above ${process.cwd()}`);
}

export const ROOT = findRoot();
export const CONTENT_DIR = join(ROOT, 'content', PLUGIN_ID);

const readJson = (file) => JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));

export function loadModel() {
  const config = readJson('plugin.config.json');
  const nav = readJson('nav.json');
  const titles = readJson('titles.json');
  return { config, nav, titles };
}

/* ----------------------------------------------------------------- vocabulary */

/** PPDS §5, in canonical order, with the nav group each section's top-level node uses. */
export const SECTIONS = [
  { id: 'getting-started', group: 'getting-started-group', name: 'Getting started', mandatory: true },
  { id: 'features', group: 'features-group', name: 'Features', mandatory: true },
  { id: 'demos', group: 'demos-group', name: 'Demos', mandatory: false },
  { id: 'reference', group: 'api-group', name: 'Reference', mandatory: true },
  { id: 'customization', group: 'customization-group', name: 'Customization', mandatory: true },
  { id: 'guides', group: 'guides-group', name: 'Guides', mandatory: true },
  { id: 'integrations', group: 'integrations-group', name: 'Integrations', mandatory: true },
  { id: 'resources', group: 'resources-group', name: 'Resources', mandatory: false },
  { id: 'migration', group: 'migration-group', name: 'Migration', mandatory: true },
  { id: 'discover-more', group: 'discover-more-group', name: 'Discover more', mandatory: true },
  { id: 'design-resources', group: 'design-resources-group', name: 'Design resources', mandatory: false },
];

/** PPDS §5 feature-group vocabulary. */
export const TAXONOMY = [
  'Core features',
  'Advanced features',
  'Content & data',
  'Display & layout',
  'Interaction',
  'Automation',
  'Integrations',
  'Administration',
  'Developer tools',
];

/** PPDS §7.1 lifecycle badges (tier badges come from plugin.config.json#/tiers). */
export const LIFECYCLE_BADGES = { new: 'New', preview: 'Preview', beta: 'Beta', planned: 'Planned', deprecated: 'Deprecated', legacy: 'Legacy' };

/** PPDS §2.3 footer columns. */
export const FOOTER_COLUMNS = ['Products', 'Resources', 'Explore', 'Company'];

/* ------------------------------------------------------------------ archetypes */

/**
 * Required blocks per archetype (PPDS §6), as the conformance script checks them on
 * rendered HTML. `h2` lists required second-level headings in required order;
 * `layout` lists blocks the layout renders from data, identified by data attributes.
 */
export const ARCHETYPES = {
  A: {
    name: 'Docs Overview',
    h2: ['Introduction', 'Why {name}', 'Start now'],
    layout: ['subtitle', 'page-actions'],
  },
  B: {
    name: 'Capability page',
    h2: ['Basics', 'Customization', 'Limitations', 'API'],
    layout: ['subtitle', 'resource-chips', 'api-links', 'page-actions'],
  },
  C: {
    name: 'Features index',
    h2: [],
    layout: ['scope', 'feature-groups', 'page-actions'],
  },
  F: {
    name: 'Getting-started page',
    h2: ['Prerequisites', 'Installation', 'Minimal working example', 'Verification', 'Next steps'],
    layout: ['subtitle', 'page-actions'],
  },
  I: {
    name: 'Editorial',
    h2: [],
    layout: ['subtitle', 'date', 'page-actions'],
  },
  E: {
    name: 'Reference page',
    h2: ['Used by', 'Import', 'Source'],
    /** One of these carries the symbol's structure (§6 E "Options / Props / Settings"; E-09). */
    h2AnyOf: ['Props', 'Members', 'Parameters', 'Definition'],
    layout: ['subtitle', 'page-actions'],
  },
};

/* ------------------------------------------------------------------------ nav */

export const isGroup = (node) => node.pathname.endsWith('-group');
export const isMachine = (node) => node.pathname.endsWith('.txt');

/** Every node with its depth, parent chain and top-level section id. */
export function flattenNav(nav) {
  const out = [];
  const walk = (nodes, depth, parents, section) => {
    for (const node of nodes) {
      const sectionId = depth === 1 ? SECTIONS.find((s) => node.pathname.endsWith(`/${s.group}`))?.id ?? null : section;
      out.push({ node, depth, parents, section: sectionId });
      if (node.children) walk(node.children, depth + 1, [...parents, node], sectionId);
    }
  };
  walk(nav, 1, [], null);
  return out;
}

/** The pages a reader can open: not virtual groups, not machine files. */
export function navPages(nav) {
  return flattenNav(nav).filter((e) => !isGroup(e.node) && !isMachine(e.node));
}

/** The subheader group a capability node sits under, if any. */
export const groupOf = (entry) => [...entry.parents].reverse().find((p) => p.subheader)?.subheader ?? null;

/* --------------------------------------------------------------- page mapping */

/**
 * Where a nav page's Markdown lives, relative to content/{plugin-id}/, and which
 * archetype it is. PPDS §8.1 file tree; URL → file is fixed here, so a file never
 * decides its own URL (P2).
 */
export function pageSpec(entry, config) {
  const { node, section } = entry;
  if (node.symbol) return { file: `reference/${node.symbol}.strings.json`, archetype: 'E' };
  const prefix = `/${config.id}/`;
  if (!node.pathname.startsWith(prefix)) throw new Error(`outside namespace: ${node.pathname}`);
  const rest = node.pathname.slice(prefix.length).replace(/\/$/, '');
  const parts = rest === '' ? [] : rest.split('/');

  if (node.capabilityId) {
    return { file: `features/${node.capabilityId}/index.md`, archetype: 'B' };
  }
  if (parts.length === 0) return { file: 'overview.md', archetype: 'A' };
  if (rest === 'all-features') return { file: 'all-features.md', archetype: 'C' };

  switch (section) {
    case 'getting-started': {
      const page = parts[1];
      return { file: `getting-started/${page}.md`, archetype: ['installation', 'usage', 'requirements'].includes(page) ? 'F' : 'I' };
    }
    case 'demos':
      return { file: `demos/${parts[1]}/index.md`, archetype: 'I' };
    case 'customization':
      return { file: parts.length === 1 ? 'customization/index.md' : `customization/${parts[1]}.md`, archetype: 'I' };
    case 'guides':
    case 'integrations':
    case 'resources':
    case 'migration':
    case 'discover-more':
      return { file: `${parts[0]}/${parts[1]}.md`, archetype: 'I' };
    default:
      throw new Error(`no page mapping for ${node.pathname} (section ${section})`);
  }
}

/** URL of a page's Markdown twin (PPDS §7.7): `/{id}/index.md` for the root, else the path + `.md`. */
export function twinPath(pathname, config) {
  const root = `/${config.id}/`;
  return pathname === root ? `${root}index.md` : `${pathname.replace(/\/$/, '')}.md`;
}

/** URL of a page's generated social image. */
export function ogImagePath(pathname) {
  const clean = pathname.replace(/^\/|\/$/g, '');
  return `/og/${clean}.png`;
}

/** Reference page for an exported symbol (PPDS §3): kebab-case of the export name. */
export function symbolPath(symbol, config) {
  const kebab = symbol
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return `/${config.id}/api/${kebab}/`;
}

/** H1 text for a page: fixed by archetype A (Overview) and E (reference). */
export function headingFor(entry, config, titles) {
  const archetype = pageSpec(entry, config).archetype;
  if (archetype === 'A') return `${config.name} — Overview`;
  if (archetype === 'E') return `${entry.node.symbol} reference`;
  return titles[entry.node.pathname];
}

/* ------------------------------------------------------------------ reference */

export const REFERENCE_DIR = join(CONTENT_DIR, 'reference');

/** Generated reference entries, alphabetical (N1 allows it only here). */
export function referenceEntries(config) {
  if (!existsSync(REFERENCE_DIR)) return [];
  return readdirSync(REFERENCE_DIR)
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) => {
      const symbol = f.replace('.schema.json', '');
      const read = (name) => (existsSync(join(REFERENCE_DIR, name)) ? JSON.parse(readFileSync(join(REFERENCE_DIR, name), 'utf8')) : {});
      return { symbol, pathname: symbolPath(symbol, config), schema: read(f), strings: read(`${symbol}.strings.json`) };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol, 'en', { sensitivity: 'base' }));
}

/**
 * nav.json with the Reference section's children injected from the generated array
 * (N3). Injected nodes carry `symbol`; they exist only at build time.
 */
export function navWithReference(nav, config) {
  const refs = referenceEntries(config);
  return nav.map((node) =>
    node.pathname.endsWith('/api-group')
      ? { ...node, children: refs.map((r) => ({ pathname: r.pathname, symbol: r.symbol })) }
      : node,
  );
}

/** Titles for generated nodes join titles.json at build time. */
export function titlesWithReference(titles, config) {
  return { ...titles, ...Object.fromEntries(referenceEntries(config).map((r) => [r.pathname, r.symbol])) };
}

/** Badges for a nav node, derived only from its plan and lifecycle (N4/P7). */
export function badgesFor(node, config) {
  const badges = [];
  const tier = node.plan ? config.tiers.find((t) => t.id === node.plan) : null;
  if (tier?.badge) badges.push({ kind: 'plan', value: node.plan, label: tier.badge, href: tier.explainerHref ?? null });
  if (node.lifecycle) badges.push({ kind: 'lifecycle', value: node.lifecycle, label: LIFECYCLE_BADGES[node.lifecycle] });
  return badges;
}

/* ------------------------------------------------------------------ redirects */

/** Minimal RFC 4180 CSV → objects keyed by the header row. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/**
 * The url-map rows this site can serve as HTTP redirects: legacy URLs that are
 * paths on the docs host. Everything else is hosted elsewhere or never had a route
 * (EXCEPTIONS E-03, E-04, E-08).
 */
export function siteRedirects() {
  const rows = parseCsv(readFileSync(join(ROOT, 'docs', 'migration', 'url-map.csv'), 'utf8'));
  return rows
    .map((row) => ({ row, from: row.legacy_url, to: row.redirect.split(' ')[0] }))
    .filter(({ from, to }) => from.startsWith('/') && to.startsWith('/'))
    .map(({ row, from, to }) => ({ from, to, status: 301, row }));
}

export function legacyRows() {
  return parseCsv(readFileSync(join(ROOT, 'docs', 'migration', 'url-map.csv'), 'utf8'));
}
