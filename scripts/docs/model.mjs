/**
 * The docs content model, as plain functions over the data files in content/react-globe/.
 *
 * Shared by the docs site and the reference generator, so both agree on where a page's
 * file lives and which kind of page renders it. Nothing here reads
 * Markdown bodies.
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
  throw new Error(`[docs] no ${marker} above ${process.cwd()}`);
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

/** Sidebar sections, in order, with the nav group each section's top-level node uses. */
export const SECTIONS = [
  { id: 'getting-started', group: 'getting-started-group' },
  { id: 'features', group: 'features-group' },
  { id: 'demos', group: 'demos-group' },
  { id: 'reference', group: 'api-group' },
  { id: 'customization', group: 'customization-group' },
  { id: 'guides', group: 'guides-group' },
  { id: 'integrations', group: 'integrations-group' },
  { id: 'migration', group: 'migration-group' },
  { id: 'discover-more', group: 'discover-more-group' },
];

/** Lifecycle badges a nav node can carry. */
export const LIFECYCLE_BADGES = { new: 'New', preview: 'Preview', beta: 'Beta', planned: 'Planned', deprecated: 'Deprecated', legacy: 'Legacy' };

/** Footer columns. */
export const FOOTER_COLUMNS = ['Get started', 'Resources', 'Project'];

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

/* --------------------------------------------------------------- page mapping */

/**
 * Where a nav page's Markdown lives, relative to content/{plugin-id}/, and which
 * kind of page it is. URL → file is fixed here, so a file never decides its own URL.
 */
export function pageSpec(entry, config) {
  const { node, section } = entry;
  if (node.symbol) return { file: `reference/${node.symbol}.strings.json`, kind: 'reference' };
  const prefix = `/${config.id}/`;
  if (!node.pathname.startsWith(prefix)) throw new Error(`outside namespace: ${node.pathname}`);
  const rest = node.pathname.slice(prefix.length).replace(/\/$/, '');
  const parts = rest === '' ? [] : rest.split('/');

  if (node.capabilityId) {
    return { file: `features/${node.capabilityId}/index.md`, kind: 'feature' };
  }
  if (parts.length === 0) return { file: 'overview.md', kind: 'overview' };
  if (rest === 'all-features') return { file: 'all-features.md', kind: 'all-features' };

  switch (section) {
    case 'getting-started': {
      const page = parts[1];
      return { file: `getting-started/${page}.md`, kind: ['installation', 'usage', 'ai-context', 'requirements'].includes(page) ? 'getting-started' : 'article' };
    }
    case 'demos':
      return { file: `demos/${parts[1]}/index.md`, kind: 'article' };
    case 'customization':
      return { file: parts.length === 1 ? 'customization/index.md' : `customization/${parts[1]}.md`, kind: 'article' };
    case 'guides':
    case 'integrations':
    case 'migration':
    case 'discover-more':
      return { file: `${parts[0]}/${parts[1]}.md`, kind: 'article' };
    default:
      throw new Error(`no page mapping for ${node.pathname} (section ${section})`);
  }
}

/** URL of a page's Markdown twin: `/{id}/index.md` for the root, else the path + `.md`. */
export function twinPath(pathname, config) {
  const root = `/${config.id}/`;
  return pathname === root ? `${root}index.md` : `${pathname.replace(/\/$/, '')}.md`;
}

/** URL of a page's generated social image. */
export function ogImagePath(pathname) {
  const clean = pathname.replace(/^\/|\/$/g, '');
  return `/og/${clean}.png`;
}

/** Reference page for an exported symbol: kebab-case of the export name. */
export function symbolPath(symbol, config) {
  const kebab = symbol
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return `/${config.id}/api/${kebab}/`;
}

/** H1 text for a page: fixed for the overview and for reference pages. */
export function headingFor(entry, config, titles) {
  const { kind } = pageSpec(entry, config);
  if (kind === 'overview') return `${config.name} — Overview`;
  if (kind === 'reference') return `${entry.node.symbol} reference`;
  return titles[entry.node.pathname];
}

/* ------------------------------------------------------------------ reference */

const REFERENCE_DIR = join(CONTENT_DIR, 'reference');

/** Generated reference entries, alphabetical. */
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
 * nav.json with the Reference section's children injected from the generated
 * reference. Injected nodes carry `symbol`; they exist only at build time.
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

/** Badges for a nav node, derived only from its lifecycle. */
export function badgesFor(node, config) {
  const badges = [];
  if (node.lifecycle) badges.push({ kind: 'lifecycle', value: node.lifecycle, label: LIFECYCLE_BADGES[node.lifecycle] });
  return badges;
}

/* ------------------------------------------------------------------ redirects */

/** Moved URLs, from redirects.json. A URL is never deleted, only redirected. */
export function siteRedirects() {
  return readJson('redirects.json').map(({ from, to }) => ({ from, to, status: 301 }));
}
