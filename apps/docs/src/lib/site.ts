/**
 * Everything the templates need, derived from the plugin's data files and the
 * content collection. Templates never read nav.json, titles.json or
 * plugin.config.json themselves: one derivation, rendered everywhere (P7, P10).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  ARCHETYPES,
  CONTENT_DIR,
  FOOTER_COLUMNS,
  SECTIONS,
  badgesFor,
  flattenNav,
  headingFor,
  isGroup,
  isMachine,
  loadModel,
  navPages,
  ogImagePath,
  pageSpec,
  symbolPath,
  twinPath,
  type Archetype,
  type Badge,
  type NavEntry,
  type NavNode,
} from '../../../../scripts/ppds/model.mjs';

export const model = loadModel();
export const { config, nav, titles } = model;

export type { Archetype, Badge, NavNode };

/** Destinations the docs chrome links to; plugin.config.json must declare them. */
const REQUIRED_LINKS = ['issues', 'support', 'changelog', 'roadmap'] as const;
const links = Object.fromEntries(
  REQUIRED_LINKS.map((key) => {
    const value = config.links?.[key];
    if (!value) throw new Error(`[ppds] plugin.config.json links.${key} is required by the docs chrome`);
    return [key, value];
  }),
) as Record<(typeof REQUIRED_LINKS)[number], string>;
export type DocEntry = CollectionEntry<'docs'>;

export type Page = {
  pathname: string;
  /** Title from titles.json (N2). */
  title: string;
  /** The H1: the Overview's is fixed by archetype A. */
  heading: string;
  description: string;
  archetype: Archetype;
  file: string;
  section: string | null;
  node: NavNode;
  badges: Badge[];
  entry: DocEntry;
  twin: string;
  ogImage: string;
};

let pagesCache: Page[] | null = null;

/** Every nav page with its content entry. A nav page without a file fails the build. */
export async function getPages(): Promise<Page[]> {
  if (pagesCache) return pagesCache;
  const entries = await getCollection('docs');
  const byId = new Map(entries.map((e) => [e.id, e]));
  const pages = navPages(nav).map((navEntry: NavEntry): Page => {
    const spec = pageSpec(navEntry, config);
    const entry = byId.get(spec.file);
    if (!entry) throw new Error(`[ppds] ${navEntry.node.pathname} has no content file ${spec.file} — run the scaffold`);
    return {
      pathname: navEntry.node.pathname,
      title: titles[navEntry.node.pathname],
      heading: headingFor(navEntry, config, titles),
      description: entry.data.description,
      archetype: spec.archetype,
      file: spec.file,
      section: navEntry.section,
      node: navEntry.node,
      badges: badgesFor(navEntry.node, config),
      entry,
      twin: twinPath(navEntry.node.pathname, config),
      ogImage: ogImagePath(navEntry.node.pathname),
    };
  });
  pagesCache = pages;
  return pages;
}

export async function pageByPath(pathname: string): Promise<Page | undefined> {
  return (await getPages()).find((p) => p.pathname === pathname);
}

/* ---------------------------------------------------------------- sidebar */

export type SidebarItem =
  | { kind: 'section'; id: string; title: string; icon: string | null; items: SidebarItem[] }
  | { kind: 'group'; title: string; items: SidebarItem[] }
  | { kind: 'link'; href: string; title: string; description: string | null; badges: Badge[] };

/** The sidebar, straight from nav.json: order, grouping and badges are the data's (N1, N4). */
export async function sidebar(): Promise<SidebarItem[]> {
  const pages = new Map((await getPages()).map((p) => [p.pathname, p]));
  const toItem = (node: NavNode, depth: number): SidebarItem => {
    const children = (node.children ?? []).map((c) => toItem(c, depth + 1));
    if (depth === 1) {
      const section = SECTIONS.find((s) => node.pathname.endsWith(`/${s.group}`));
      return { kind: 'section', id: section?.id ?? node.pathname, title: titles[node.pathname], icon: node.icon ?? null, items: children };
    }
    if (isGroup(node)) return { kind: 'group', title: node.subheader ?? titles[node.pathname], items: children };
    return {
      kind: 'link',
      href: node.pathname,
      title: titles[node.pathname],
      description: pages.get(node.pathname)?.description ?? null,
      badges: badgesFor(node, config),
    };
  };
  return nav.map((n) => toItem(n, 1));
}

/** Capability pages grouped by subheader, in sidebar order (archetype C renders this; check 6). */
export async function featureGroups(): Promise<{ group: string; pages: Page[] }[]> {
  const pages = new Map((await getPages()).map((p) => [p.pathname, p]));
  const features = nav.find((n) => n.pathname.endsWith('/features-group'));
  return (features?.children ?? [])
    .filter((n) => n.subheader)
    .map((group) => ({
      group: group.subheader!,
      pages: (group.children ?? []).map((c) => pages.get(c.pathname)).filter((p): p is Page => Boolean(p)),
    }));
}

/* -------------------------------------------------------------- reference */

/** A symbol's reference page, or null until Phase 4 has generated it (never a dead link). */
export function referenceHref(symbol: string): string | null {
  return existsSync(join(CONTENT_DIR, 'reference', `${symbol}.schema.json`)) ? symbolPath(symbol, config) : null;
}

/* ------------------------------------------------------------- page links */

export const editUrl = (file: string): string => `${config.repo}/edit/main/content/${config.id}/${file}`;

export function feedbackUrl(page: Page, helpful: boolean): string {
  const title = `Docs feedback: ${page.title} — ${helpful ? 'helpful' : 'not helpful'}`;
  const body = `Page: ${page.pathname}\nHelpful: ${helpful ? 'yes' : 'no'}\n\nWhat could be better?\n`;
  return `${links.issues}/new?labels=docs-feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** Resource chip row (archetype B) from frontmatter `links`, never hand-written. */
export function resourceChips(entry: DocEntry): { key: string; label: string; href: string }[] {
  const links = entry.data.links ?? {};
  const LABELS: Record<string, string> = { issues: 'Feedback', source: 'Source', spec: 'Standard', design: 'Design asset', size: 'Size' };
  return Object.entries(links).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    href: key === 'source' && !/^https?:/.test(value) ? `${config.repo}/tree/main/${value}` : value,
  }));
}

/* --------------------------------------------------------------- metadata */

/** Site-wide design constant, not plugin branding (PPDS §12 allows branding.accentColor to override). */
export const THEME_COLOR = config.branding?.accentColor ?? '#1f4e79';

export const currentVersion = (): { label: string; href: string } =>
  (config.versions ?? []).find((v: { current?: boolean }) => v.current) ?? { label: config.currentVersion, href: `/${config.id}/` };

/** The PPDS §7.6 set, all from one title and one description. */
export function metadata(page: Page, site: URL) {
  const url = new URL(page.pathname, site).href;
  const image = new URL(page.ogImage, site).href;
  const documentTitle = page.archetype === 'A' ? page.heading : `${page.title} — ${config.name}`;
  return {
    documentTitle,
    canonical: url,
    description: page.description,
    meta: [
      { name: 'description', content: page.description },
      { property: 'og:title', content: documentTitle },
      { property: 'og:description', content: page.description },
      { property: 'og:image', content: image },
      { property: 'og:type', content: page.archetype === 'A' ? 'website' : 'article' },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: documentTitle },
      { name: 'twitter:description', content: page.description },
      { name: 'twitter:image', content: image },
      { name: 'theme-color', content: THEME_COLOR },
      { name: 'search:language', content: 'en' },
      { name: 'search:version', content: currentVersion().label },
      { name: 'plugin:id', content: config.id },
      { name: 'plugin:categoryId', content: config.categoryId ?? '' },
    ],
  };
}

/* ----------------------------------------------------------------- footer */

type FooterLink = { title: string; href: string };

/** PPDS §2.3 columns, with only destinations that exist (operating rule 4). */
export function footerColumns(): { title: string; links: FooterLink[] }[] {
  const id = config.id;
  const columns: Record<string, FooterLink[]> = {
    Products: [{ title: config.name, href: `/${id}/` }],
    Resources: [
      { title: titles[`/${id}/resources/bundled-data/`], href: `/${id}/resources/bundled-data/` },
      { title: titles[`/${id}/customization/`], href: `/${id}/customization/` },
      { title: titles[`/${id}/demos/playground/`], href: `/${id}/demos/playground/` },
    ],
    Explore: [
      { title: 'Documentation', href: `/${id}/` },
      { title: titles[`/${id}/all-features/`], href: `/${id}/all-features/` },
      { title: titles[`/${id}/discover-more/showcase/`], href: `/${id}/discover-more/showcase/` },
      { title: titles[`/${id}/discover-more/roadmap/`], href: links.roadmap },
      { title: 'Repository', href: config.repo },
    ],
    Company: [
      { title: titles[`/${id}/getting-started/support/`], href: links.support },
      { title: titles[`/${id}/discover-more/changelog/`], href: links.changelog },
      { title: 'License (MIT)', href: `${config.repo}/blob/main/LICENSE` },
    ],
  };
  return FOOTER_COLUMNS.map((title: string) => ({ title, links: columns[title] ?? [] }));
}

/* ----------------------------------------------------------- llms / sections */

/** Section title for a page, for llms.txt grouping. */
export function sectionTitle(sectionId: string | null): string {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return section ? titles[`/${config.id}/${section.group}`] ?? section.name : String(sectionId);
}

export { ARCHETYPES, flattenNav, isGroup, isMachine, symbolPath };
