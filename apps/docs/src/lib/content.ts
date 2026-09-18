/**
 * The plugin's authored Markdown, read in place from content/react-globe/.
 *
 * Entry ids are the file paths relative to that directory, exactly as
 * scripts/docs/model.mjs#pageSpec names them, so a nav node finds its file
 * without any file deciding its own URL. Frontmatter is checked against the
 * contract below: every key is known, and the required one is present.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { CONTENT_DIR } from '../../../../scripts/docs/model.mjs';

/**
 * What a page says about itself. Its title and its place in the sidebar are nav data
 * (titles.json, nav.json), so a page cannot disagree with the navigation about either.
 */
export type Frontmatter = {
  /** The one description: meta, the line under the H1, and llms.txt. */
  description: string;
  /** Exported names the page documents; its API list and the reference's "Used by". */
  symbols?: string[];
  /** A feature page's resource chips: issues, source, spec, design, size. */
  links?: Record<string, string>;
  /** Shown on articles. */
  date?: Date;
};

export type DocEntry = {
  /** Path relative to content/react-globe/, forward slashes. */
  id: string;
  /** Absolute path, for the demo and include directives. */
  filePath: string;
  data: Frontmatter;
  body: string;
};

const REQUIRED = ['description'] as const;
const OPTIONAL = ['symbols', 'links', 'date'] as const;

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((v) => typeof v === 'string');

function validate(raw: Record<string, unknown>, id: string): Frontmatter {
  const fail = (message: string): never => {
    throw new Error(`[docs] ${id}: ${message}`);
  };
  for (const key of Object.keys(raw)) {
    if (!(REQUIRED as readonly string[]).includes(key) && !(OPTIONAL as readonly string[]).includes(key)) fail(`unknown frontmatter key "${key}"`);
  }
  for (const key of REQUIRED) if (typeof raw[key] !== 'string') fail(`frontmatter ${key} must be a string`);
  if (raw.symbols !== undefined && !isStringArray(raw.symbols)) fail('frontmatter symbols must be a list of strings');
  if (raw.links !== undefined && !isStringRecord(raw.links)) fail('frontmatter links must be a map of strings');

  const date = raw.date === undefined ? undefined : new Date(raw.date instanceof Date ? raw.date : String(raw.date));
  if (date && Number.isNaN(date.getTime())) fail(`frontmatter date "${String(raw.date)}" is not a date`);

  return { ...(raw as Omit<Frontmatter, 'date'>), ...(date ? { date } : {}) };
}

/** The frontmatter block, then the body. */
function split(source: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  return { frontmatter: (parseYaml(match[1]) ?? {}) as Record<string, unknown>, body: source.slice(match[0].length) };
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name);
    if (item.isDirectory()) return markdownFiles(full);
    return item.isFile() && item.name.endsWith('.md') ? [full] : [];
  });
}

let cache: DocEntry[] | null = null;

/** Every authored page, id'd by its path under content/react-globe/. */
export function getCollection(): DocEntry[] {
  if (cache) return cache;
  cache = markdownFiles(CONTENT_DIR)
    .map((filePath) => {
      const id = relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
      const { frontmatter, body } = split(readFileSync(filePath, 'utf8'));
      return { id, filePath, data: validate(frontmatter, id), body };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return cache;
}
