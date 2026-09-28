/**
 * Everything the templates need, derived from the plugin's data files, the content
 * collection and the generated reference. Templates never read nav.json, titles.json,
 * plugin.config.json or reference/*.json themselves: one derivation, rendered
 * everywhere.
 */

import { getCollection, type DocEntry } from './content';
import {
  FOOTER_COLUMNS,
  SECTIONS,
  badgesFor,
  flattenNav,
  headingFor,
  isGroup,
  loadModel,
  navPages,
  navWithReference,
  ogImagePath,
  pageSpec,
  referenceEntries,
  symbolPath,
  titlesWithReference,
  twinPath,
  type PageKind,
  type Badge,
  type NavEntry,
  type NavNode,
  type ReferenceEntry,
} from '../../../../scripts/docs/model.mjs';

const model = loadModel();
export const { config } = model;
/** nav.json with the generated Reference children injected. */
export const nav: NavNode[] = navWithReference(model.nav, config);
/** titles.json plus the generated reference titles. */
export const titles: Record<string, string> = titlesWithReference(model.titles, config);
export const references: ReferenceEntry[] = referenceEntries(config);

export type { Badge, NavNode, PageKind, ReferenceEntry };
export type { DocEntry };

/** Destinations the docs chrome links to; plugin.config.json must declare them. */
const REQUIRED_LINKS = ['issues', 'support', 'changelog', 'roadmap'] as const;
export const links = Object.fromEntries(
  REQUIRED_LINKS.map((key) => {
    const value = config.links?.[key];
    if (!value) throw new Error(`[docs] plugin.config.json links.${key} is required by the docs chrome`);
    return [key, value];
  }),
) as Record<(typeof REQUIRED_LINKS)[number], string>;

export type Page = {
  pathname: string;
  /** Title from titles.json, or the symbol name for a reference page. */
  title: string;
  /** The H1: fixed for the overview and for reference pages. */
  heading: string;
  /** The one description: meta, H1 subtitle and llms.txt. Plain text. */
  description: string;
  kind: PageKind;
  /** Source file relative to content/{id}/ — the file "Edit this page" opens. */
  file: string;
  section: string | null;
  node: NavNode;
  badges: Badge[];
  /** Authored pages. */
  entry?: DocEntry;
  /** Generated reference pages. */
  reference?: ReferenceEntry;
  twin: string;
  ogImage: string;
};

/** Reference prose may carry inline code marks; the description field is plain text. */
const plain = (text: string): string => text.replace(/`([^`]+)`/g, '$1');

let pagesCache: Page[] | null = null;

/** Every nav page, authored and generated. A nav page without a source fails the build. */
export function getPages(): Page[] {
  if (pagesCache) return pagesCache;
  const entries = getCollection();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const bySymbol = new Map(references.map((r) => [r.symbol, r]));
  const pages = navPages(nav).map((navEntry: NavEntry): Page => {
    const spec = pageSpec(navEntry, config);
    const base = {
      pathname: navEntry.node.pathname,
      title: titles[navEntry.node.pathname],
      heading: headingFor(navEntry, config, titles),
      kind: spec.kind,
      file: spec.file,
      section: navEntry.section,
      node: navEntry.node,
      badges: badgesFor(navEntry.node, config),
      twin: twinPath(navEntry.node.pathname, config),
      ogImage: ogImagePath(navEntry.node.pathname),
    };
    if (navEntry.node.symbol) {
      const reference = bySymbol.get(navEntry.node.symbol)!;
      return { ...base, description: plain(reference.strings.symbolDescription ?? ''), reference };
    }
    const entry = byId.get(spec.file);
    if (!entry) throw new Error(`[docs] ${navEntry.node.pathname} has no content file ${spec.file}`);
    return { ...base, description: entry.data.description, entry };
  });
  pagesCache = pages;
  return pages;
}

export function pageByPath(pathname: string): Page | undefined {
  return getPages().find((p) => p.pathname === pathname);
}

/* ---------------------------------------------------------------- sidebar */

export type SidebarItem =
  | { kind: 'section'; id: string; title: string; items: SidebarItem[] }
  | { kind: 'group'; title: string; items: SidebarItem[] }
  | { kind: 'link'; href: string; title: string; description: string | null; badges: Badge[]; code: boolean };

/** The sidebar, straight from the nav data: order, grouping and badges are the data's. */
export function sidebar(): SidebarItem[] {
  const pages = new Map(getPages().map((p) => [p.pathname, p]));
  const toItem = (node: NavNode, depth: number): SidebarItem => {
    const children = (node.children ?? []).map((c) => toItem(c, depth + 1));
    if (depth === 1) {
      const section = SECTIONS.find((s) => node.pathname.endsWith(`/${s.group}`));
      return { kind: 'section', id: section?.id ?? node.pathname, title: titles[node.pathname], items: children };
    }
    if (isGroup(node)) return { kind: 'group', title: node.subheader ?? titles[node.pathname], items: children };
    return {
      kind: 'link',
      href: node.pathname,
      title: titles[node.pathname],
      description: pages.get(node.pathname)?.description ?? null,
      badges: badgesFor(node, config),
      code: Boolean(node.symbol),
    };
  };
  return nav.map((n) => toItem(n, 1));
}

/** Capability pages grouped by subheader, in sidebar order. */
export function featureGroups(): { group: string; pages: Page[] }[] {
  const pages = new Map(getPages().map((p) => [p.pathname, p]));
  const features = nav.find((n) => n.pathname.endsWith('/features-group'));
  return (features?.children ?? [])
    .filter((n) => n.subheader)
    .map((group) => ({
      group: group.subheader!,
      pages: (group.children ?? []).map((c) => pages.get(c.pathname)).filter((p): p is Page => Boolean(p)),
    }));
}

/* -------------------------------------------------------------- reference */

const referenceSymbols = new Set(references.map((r) => r.symbol));

/** A symbol's reference page, or null when the generator has not produced one (never a dead link). */
export function referenceHref(symbol: string): string | null {
  return referenceSymbols.has(symbol) ? symbolPath(symbol, config) : null;
}

export const referenceFor = (symbol: string): ReferenceEntry | undefined => references.find((r) => r.symbol === symbol);

/** The H2 that carries a symbol's structure. */
export function structureHeading(ref: ReferenceEntry): 'Props' | 'Members' | 'Parameters' | 'Definition' {
  if (ref.schema.kind === 'component') return 'Props';
  if (ref.schema.kind === 'function') return 'Parameters';
  if (ref.schema.options && Object.keys(ref.schema.options).length > 0) return 'Members';
  return 'Definition';
}

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Reference prose to HTML: escaped text with `code` spans. */
export const inlineHtml = (text: string | undefined): string =>
  escapeHtml(text ?? '').replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`);

const mdCell = (text: string | undefined): string => (text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const mdCode = (text: string | number | boolean | null | undefined): string =>
  text === undefined || text === null || text === '' ? '—' : `\`${mdCell(String(text))}\``;

/** A reference page as Markdown, for its twin and for the twins of pages that use it. */
export function referenceMarkdown(ref: ReferenceEntry, site: URL | undefined, depth = 2): string {
  const h = '#'.repeat(depth);
  const { schema, strings } = ref;
  const abs = (path: string) => (site ? new URL(path, site).href : path);
  const out: string[] = [];
  const pagesUsing = schema.usedBy.map((p) => `- [${titles[p] ?? p}](${abs(twinPath(p, config))})`);
  out.push(`${h} Used by`, pagesUsing.length ? pagesUsing.join('\n') : 'Not used by any page.');
  out.push(`${h} Import`, ['```ts', ...schema.imports, '```'].join('\n'));
  if (schema.inheritance) out.push(`${h} Extends`, `[\`${schema.inheritance.symbol}\`](${abs(twinPath(schema.inheritance.pathname, config))})`);

  const heading = structureHeading(ref);
  if (heading === 'Definition') {
    out.push(`${h} Definition`, ['```ts', `${schema.kind === 'type' ? `type ${schema.name} = ` : `const ${schema.name}: `}${schema.definition ?? 'unknown'}`, '```'].join('\n'));
  } else {
    if (schema.signature) out.push(`${h} Signature`, ['```ts', schema.signature, '```'].join('\n'));
    const rows = Object.entries(schema.options ?? {}).map(
      ([name, o]) => `| \`${name}\` | ${mdCode(o.type.name)} | ${mdCode(o.default)} | ${o.required ? 'Yes' : 'No'} | ${mdCell(strings.optionDescriptions?.[name])} |`,
    );
    out.push(`${h} ${heading}`, ['| Name | Type | Default | Required | Description |', '|---|---|---|---|---|', ...rows].join('\n'));
    if (schema.returns) out.push(`${h} Returns`, mdCode(schema.returns));
  }
  if (schema.events && Object.keys(schema.events).length) {
    const rows = Object.entries(schema.events).map(([name, o]) => `| \`${name}\` | ${mdCode(o.type.name)} | ${mdCell(strings.eventDescriptions?.[name])} |`);
    out.push(`${h} Events`, ['| Name | Type | Description |', '|---|---|---|', ...rows].join('\n'));
  }
  if (schema.tokens?.length) {
    const rows = schema.tokens.flatMap((t) =>
      t.usages.map((u, i) => `| ${i === 0 ? `\`${t.name}\`` : ''} | ${u.element} | ${u.property} | \`${u.fallback}\` | ${i === 0 ? mdCell(strings.tokenDescriptions?.[t.name]) : ''} |`),
    );
    out.push(`${h} Tokens`, ['| Token | Element | Property | Fallback | Controls |', '|---|---|---|---|---|', ...rows].join('\n'));
  }
  out.push(`${h} Source`, `[${schema.filename}](${schema.sourceUrl})`);
  return out.join('\n\n');
}

/* ------------------------------------------------------------- page links */

export const editUrl = (file: string): string => `${config.repo}/edit/main/content/${config.id}/${file}`;

export function feedbackUrl(page: Page, helpful: boolean): string {
  const title = `Docs feedback: ${page.title} — ${helpful ? 'helpful' : 'not helpful'}`;
  const body = `Page: ${page.pathname}\nHelpful: ${helpful ? 'yes' : 'no'}\n\nWhat could be better?\n`;
  return `${links.issues}/new?labels=docs-feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** Resource chip row of a feature page, from frontmatter `links`, never hand-written. */
export function resourceChips(entry: DocEntry): { key: string; label: string; href: string }[] {
  const chipLinks = entry.data.links ?? {};
  const LABELS: Record<string, string> = { issues: 'Feedback', source: 'Source', spec: 'Standard', design: 'Design asset', size: 'Size' };
  return Object.entries(chipLinks).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    href: key === 'source' && !/^https?:/.test(value) ? `${config.repo}/tree/main/${value}` : value,
  }));
}

/* --------------------------------------------------------------- metadata */

/** The accent of the social images. */
export const THEME_COLOR = '#1f4e79';

/**
 * The browser chrome follows the header it sits above: the `--bg` of each theme. The theme switch
 * updates these when a reader picks a theme other than the system's.
 */
export const HEADER_COLORS = { light: '#ffffff', dark: '#0b1120' } as const;

/** Size of the generated social images. */
export const OG_IMAGE = { width: 1200, height: 630 } as const;

export const currentVersion = (): { label: string; href: string } =>
  (config.versions ?? []).find((v) => v.current) ?? { label: config.currentVersion, href: `/${config.id}/` };

/** What a reference page lists, by kind; the symbol itself is already in the title. */
const REFERENCE_SCOPE: Record<string, string> = {
  component: 'API reference: every prop, with its type and default.',
  type: 'API reference: every member, with its type and default.',
  function: 'API reference: its parameters and return value.',
  'setting-group': 'API reference: what it holds and how to use it.',
};

/**
 * The page described in one breath, for search results and social cards: a reference page's first
 * sentence (the rest is detail for the page itself), anything else's whole description.
 */
export const shortDescription = (page: Page): string => (page.reference ? page.description.split(/(?<=\.)\s/)[0] : page.description);

/**
 * What search results show under the title. A reference page's short description is one line
 * about the symbol, so it is followed by what the page lists.
 */
function searchDescription(page: Page): string {
  if (!page.reference) return page.description;
  const scope = REFERENCE_SCOPE[page.reference.schema.kind];
  return scope ? `${shortDescription(page)} ${scope}` : shortDescription(page);
}

/** Page metadata, all from one title and one description. */
export function metadata(page: Page, site: URL) {
  const url = new URL(page.pathname, site).href;
  const image = new URL(page.ogImage, site).href;
  const documentTitle = page.kind === 'overview' ? page.heading : `${page.heading} — ${config.name}`;
  const description = searchDescription(page);
  return {
    documentTitle,
    canonical: url,
    description,
    meta: [
      { name: 'description', content: description },
      { property: 'og:site_name', content: config.name },
      { property: 'og:title', content: documentTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: documentTitle },
      { property: 'og:type', content: page.kind === 'overview' ? 'website' : 'article' },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: documentTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: documentTitle },
    ],
  };
}

/* ----------------------------------------------------------------- footer */

type FooterLink = { title: string; href: string };

/** Footer columns, with only destinations that exist. */
export function footerColumns(): { title: string; links: FooterLink[] }[] {
  const id = config.id;
  const page = (path: string): FooterLink => ({ title: titles[path], href: path });
  const columns: Record<string, FooterLink[]> = {
    'Get started': [
      page(`/${id}/`),
      page(`/${id}/getting-started/installation/`),
      page(`/${id}/getting-started/usage/`),
      page(`/${id}/getting-started/ai-context/`),
    ],
    Resources: [
      page(`/${id}/all-features/`),
      page(`/${id}/demos/playground/`),
      page(`/${id}/customization/`),
      page(`/${id}/customization/bundled-data/`),
    ],
    Project: [
      { title: titles[links.changelog], href: links.changelog },
      { title: titles[links.roadmap], href: links.roadmap },
      { title: titles[links.support], href: links.support },
      { title: 'GitHub', href: config.repo },
    ],
  };
  return FOOTER_COLUMNS.map((title: string) => ({ title, links: columns[title] ?? [] }));
}

/* ------------------------------------------------------------- breadcrumbs */

/** Plugin › section › group, from the nav data. Only the plugin root is a link: sections and groups are virtual. */
export function breadcrumbs(page: Page): { title: string; href: string | null }[] {
  const entry = flattenNav(nav).find((e) => e.node.pathname === page.pathname);
  const crumbs: { title: string; href: string | null }[] = [{ title: config.name, href: `/${config.id}/` }];
  for (const parent of entry?.parents ?? []) {
    crumbs.push({ title: parent.subheader ?? titles[parent.pathname] ?? parent.pathname, href: null });
  }
  return crumbs;
}

/* ----------------------------------------------------------- llms / sections */

/** Section title for a page, for llms.txt grouping. */
export function sectionTitle(sectionId: string | null): string {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return section ? titles[`/${config.id}/${section.group}`] ?? section.id : String(sectionId);
}

export { symbolPath };
