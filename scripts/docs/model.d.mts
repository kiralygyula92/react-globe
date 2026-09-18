/** Types for model.mjs, for TypeScript consumers (the docs site). */

/**
 * What a page is, which decides the blocks around its Markdown: the overview, a feature page
 * (resource links and an API list), the all-features index, a generated reference page, a
 * getting-started page, or an article (which shows its date).
 */
export type PageKind = 'overview' | 'feature' | 'all-features' | 'reference' | 'getting-started' | 'article';

export type NavNode = {
  pathname: string;
  subheader?: string;
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  capabilityId?: string;
  /** Set only on generated reference nodes. */
  symbol?: string;
  children?: NavNode[];
};

export type NavEntry = { node: NavNode; depth: number; parents: NavNode[]; section: string | null };

export type PluginConfig = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  repo: string;
  currentVersion: string;
  versions?: { label: string; href: string; current?: boolean; supported?: boolean }[];
  links?: Record<string, string>;
};

export type Badge = { kind: 'lifecycle'; value: string; label: string; href: string | null };

export type Section = { id: string; group: string };

export const ROOT: string;
export const PLUGIN_ID: string;
export const CONTENT_DIR: string;
export const SECTIONS: Section[];
export const LIFECYCLE_BADGES: Record<string, string>;
export const FOOTER_COLUMNS: string[];

export type ReferenceOption = { type: { name: string; description?: string }; default?: string | number | boolean | null; required?: boolean; deprecated?: boolean };
export type ReferenceSchema = {
  name: string;
  kind: 'component' | 'function' | 'hook' | 'type' | 'setting-group' | 'command' | 'event' | 'filter';
  imports: string[];
  signature?: string;
  definition?: string;
  propsType?: string;
  options?: Record<string, ReferenceOption>;
  returns?: string;
  events?: Record<string, ReferenceOption>;
  tokens?: { name: string; usages: { element: string; property: string; fallback: string }[] }[];
  inheritance: { symbol: string; pathname: string } | null;
  usedBy: string[];
  filename: string;
  sourceUrl: string;
};
export type ReferenceStrings = {
  symbolDescription?: string;
  optionDescriptions?: Record<string, string>;
  eventDescriptions?: Record<string, string>;
  tokenDescriptions?: Record<string, string>;
};
export type ReferenceEntry = { symbol: string; pathname: string; schema: ReferenceSchema; strings: ReferenceStrings };
export function referenceEntries(config: PluginConfig): ReferenceEntry[];
export function navWithReference(nav: NavNode[], config: PluginConfig): NavNode[];
export function titlesWithReference(titles: Record<string, string>, config: PluginConfig): Record<string, string>;

export function loadModel(): { config: PluginConfig; nav: NavNode[]; titles: Record<string, string> };
export function isGroup(node: NavNode): boolean;
export function isMachine(node: NavNode): boolean;
export function flattenNav(nav: NavNode[]): NavEntry[];
export function navPages(nav: NavNode[]): NavEntry[];
export function pageSpec(entry: NavEntry, config: PluginConfig): { file: string; kind: PageKind };
export function twinPath(pathname: string, config: PluginConfig): string;
export function ogImagePath(pathname: string): string;
export function symbolPath(symbol: string, config: PluginConfig): string;
export function headingFor(entry: NavEntry, config: PluginConfig, titles: Record<string, string>): string;
export function badgesFor(node: NavNode, config: PluginConfig): Badge[];
export function siteRedirects(): { from: string; to: string; status: number }[];
