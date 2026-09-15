/** Types for model.mjs, for TypeScript consumers (the docs site). */

export type Archetype = 'A' | 'B' | 'C' | 'E' | 'F' | 'I';

export type NavNode = {
  pathname: string;
  title?: string;
  subheader?: string;
  icon?: string;
  plan?: string;
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  capabilityId?: string;
  /** Set only on generated reference nodes. */
  symbol?: string;
  children?: NavNode[];
};

export type NavEntry = { node: NavNode; depth: number; parents: NavNode[]; section: string | null };

export type Tier = { id: string; name: string; badge?: string | null; icon?: string; color?: string; explainerHref?: string };

export type PluginConfig = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  categoryId?: string | null;
  urlPrefix?: string;
  repo: string;
  currentVersion: string;
  versions?: { label: string; href: string; current?: boolean; supported?: boolean }[];
  tiers: Tier[];
  links?: Record<string, string>;
  taxonomy: string[];
  sections: { id: string; title?: string; enabled?: boolean }[];
  referenceSource?: { kind: string; entry?: string; command?: string };
  branding?: { accentColor?: string; logoLight?: string; logoDark?: string; ogImageTemplate?: string };
};

export type Badge = { kind: 'plan' | 'lifecycle'; value: string; label: string; href: string | null };

export type Section = { id: string; group: string; name: string; mandatory: boolean };

export const ROOT: string;
export const PLUGIN_ID: string;
export const CONTENT_DIR: string;
export const SECTIONS: Section[];
export const TAXONOMY: string[];
export const LIFECYCLE_BADGES: Record<string, string>;
export const FOOTER_COLUMNS: string[];
export const ARCHETYPES: Record<Archetype, { name: string; h2: string[]; h2AnyOf?: string[]; layout: string[] }>;
export const REFERENCE_DIR: string;

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
export function groupOf(entry: NavEntry): string | null;
export function pageSpec(entry: NavEntry, config: PluginConfig): { file: string; archetype: Archetype };
export function twinPath(pathname: string, config: PluginConfig): string;
export function ogImagePath(pathname: string): string;
export function symbolPath(symbol: string, config: PluginConfig): string;
export function headingFor(entry: NavEntry, config: PluginConfig, titles: Record<string, string>): string;
export function badgesFor(node: NavNode, config: PluginConfig): Badge[];
export function parseCsv(text: string): Record<string, string>[];
export function siteRedirects(): { from: string; to: string; status: number; row: Record<string, string> }[];
export function legacyRows(): Record<string, string>[];
