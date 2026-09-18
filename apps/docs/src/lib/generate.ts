/**
 * Everything the site publishes besides its HTML pages: the Markdown twin of every page,
 * llms.txt, the sitemap, robots.txt, the changelog feed and a social image per page.
 *
 * All of it is derived from the same data the pages render from, so a file can never
 * describe a page that does not exist.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CONTENT_DIR, ROOT, siteRedirects } from '../../../../scripts/docs/model.mjs';
import { demosAsCode, includesAsMarkdown } from './remark-docs.mjs';
import {
  THEME_COLOR,
  config,
  featureGroups,
  getPages,
  links,
  referenceFor,
  referenceHref,
  referenceMarkdown,
  sectionTitle,
  symbolPath,
  type Page,
} from './site';

export type GeneratedFile = { path: string; body: string };

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ----------------------------------------------------------------- origin */

/**
 * Pages can name the site's own address — in a download command, say — as `{{site}}`,
 * which becomes the origin the site is built for. Written once, correct on every host.
 */
export const withSite = (markdown: string, site: URL): string => markdown.replaceAll('{{site}}', site.origin);

/* ------------------------------------------------------------------ twins */

/** Authoring comments (TODOs, porting hints) are for editors, not readers. */
const stripComments = (markdown: string): string => markdown.replace(/<!--[\s\S]*?-->\n?/g, '').trim();

/**
 * Markdown twin of a docs page: the heading, the one-line description, the authored
 * Markdown, the data-driven blocks the HTML page renders (feature groups, API links),
 * and the generated reference for the page's symbols.
 */
export function twinMarkdown(page: Page, site: URL, { inlineReferences = true }: { inlineReferences?: boolean } = {}): string {
  const parts = [`# ${page.heading}`, page.description];

  if (page.reference) {
    parts.push(referenceMarkdown(page.reference, site));
    return `${parts.filter(Boolean).join('\n\n')}\n`;
  }

  parts.push(withSite(includesAsMarkdown(demosAsCode(stripComments(page.entry?.body ?? ''), page.file, CONTENT_DIR), page.file, CONTENT_DIR), site));

  if (page.archetype === 'C') {
    for (const group of featureGroups()) {
      parts.push(`## ${group.group}`, group.pages.map((p) => `- [${p.title}](${new URL(p.twin, site).href}): ${p.description}`).join('\n'));
    }
  }

  const symbols = page.entry?.data.symbols ?? [];
  if (page.archetype === 'B') {
    parts.push(
      '## API',
      symbols
        .map((symbol) => (referenceHref(symbol) ? `- [\`${symbol}\`](${new URL(symbolPath(symbol, config), site).href})` : `- \`${symbol}\``))
        .join('\n'),
    );
  }
  // A lone page carries the reference it points at; the full file has every reference page already.
  if (inlineReferences) {
    for (const symbol of symbols) {
      const ref = referenceFor(symbol);
      if (ref) parts.push(`## ${symbol} reference`, referenceMarkdown(ref, site, 3));
    }
  }
  return `${parts.filter(Boolean).join('\n\n')}\n`;
}

export const twins = (site: URL): GeneratedFile[] => getPages().map((page) => ({ path: page.twin.replace(/^\//, ''), body: twinMarkdown(page, site) }));

/**
 * The whole documentation as one Markdown file, for an AI coding agent: every page in the
 * sidebar's reading order, each with its address, the source of every live demo where the
 * page shows it, and the generated API reference once, in its own section.
 */
export function llmsFull(site: URL): string {
  const head = [
    `# ${config.name} — documentation`,
    `> ${config.tagline}`,
    config.description,
    `Every page of the documentation at ${new URL(`/${config.id}/`, site).href}, in reading order. Generated from the same Markdown as the site, in the same build.`,
  ].join('\n\n');
  const pages = getPages().map((page) => {
    const [title, ...rest] = twinMarkdown(page, site, { inlineReferences: false }).split('\n');
    // Its address under the title, so an agent can say which page an answer came from.
    return [title, '', `Source: ${new URL(page.pathname, site).href}`, ...rest].join('\n').trimEnd();
  });
  return `${[head, ...pages].join('\n\n---\n\n')}\n`;
}

/* ----------------------------------------------------------- machine files */

/**
 * `llms.txt`: `# {Plugin}`, a two-line description, then one `## {Section}` per section
 * listing every published page as `- [Title](url.md): description`. Descriptions are the
 * same field as each page's meta description and H1 subtitle.
 */
export function llmsTxt(site: URL): string {
  const lines = [
    `# ${config.name}`,
    '',
    `> ${config.tagline}`,
    `> ${config.description}`,
    '',
    `The whole documentation in one file: ${new URL(`/${config.id}/llms-full.md`, site).href}`,
  ];
  let section: string | null = null;
  for (const page of getPages()) {
    if (page.section !== section) {
      section = page.section;
      lines.push('', `## ${sectionTitle(section)}`, '');
    }
    lines.push(`- [${page.title}](${new URL(page.twin, site).href}): ${page.description}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Sitemap of every docs page. */
export function sitemapXml(site: URL): string {
  const urls = getPages().map((p) => `  <url><loc>${escapeXml(new URL(p.pathname, site).href)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Crawling is open; the sitemap points crawlers at every page. Redirect pages carry their own noindex. */
export const robotsTxt = (site: URL): string => `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', site)}\n`;

/* -------------------------------------------------------------------- rss */

type Release = { version: string; date: string | null; body: string };

export function releases(markdown: string): Release[] {
  const out: Release[] = [];
  const pattern = /^## \[([^\]]+)\](?:\s*-\s*(.+))?$/gm;
  const heads = [...markdown.matchAll(pattern)];
  heads.forEach((head, i) => {
    const start = head.index! + head[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index! : markdown.length;
    const date = /^\d{4}-\d{2}-\d{2}$/.test((head[2] ?? '').trim()) ? head[2].trim() : null;
    out.push({ version: head[1], date, body: markdown.slice(start, end).trim() });
  });
  return out;
}

/**
 * RSS feed for the changelog. One item per version section of packages/globe/CHANGELOG.md,
 * the same file the Changelog page includes, so the feed and the page can never disagree.
 * A section without a release date has no pubDate.
 */
export function rssXml(site: URL): string {
  const changelog = readFileSync(join(ROOT, 'packages', 'globe', 'CHANGELOG.md'), 'utf8');
  const page = new URL(links.changelog, site).href;
  const items = releases(changelog).map(
    (r) => `    <item>
      <title>${escapeXml(`${config.name} ${r.version}${r.date ? '' : ' (unreleased)'}`)}</title>
      <link>${escapeXml(page)}</link>
      <guid isPermaLink="false">${escapeXml(`${config.id}@${r.version}`)}</guid>${r.date ? `\n      <pubDate>${new Date(`${r.date}T00:00:00Z`).toUTCString()}</pubDate>` : ''}
      <description><![CDATA[${r.body.replace(/]]>/g, ']]]]><![CDATA[>')}]]></description>
    </item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${config.name} changelog`)}</title>
    <link>${escapeXml(page)}</link>
    <atom:link href="${escapeXml(new URL('rss.xml', page).href)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(config.tagline)}</description>
    <language>en</language>
${items.join('\n')}
  </channel>
</rss>
`;
}

/* ------------------------------------------------------------ social image */

const escapeSvg = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap by character budget; good enough for a fixed-size card. */
function wrap(text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

/**
 * Generated social image for every docs page, built from the page's title and
 * description — never hand-made. An SVG template rasterised with sharp.
 */
export function ogSvg(page: Page): string {
  const title = wrap(page.heading, 28, 2);
  const description = wrap(page.description, 58, 3);
  const font = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f1419"/>
  <rect width="1200" height="12" fill="${THEME_COLOR}"/>
  <g fill="none" stroke="${THEME_COLOR}" stroke-width="6" transform="translate(1010 150)">
    <circle r="110"/><ellipse rx="44" ry="110"/><line x1="-110" x2="110"/>
  </g>
  <text x="80" y="110" ${font} font-size="34" font-weight="600" fill="#9aa7b4">${escapeSvg(config.name)}</text>
  ${title.map((l, i) => `<text x="80" y="${220 + i * 78}" ${font} font-size="68" font-weight="700" fill="#e6edf3">${escapeSvg(l)}</text>`).join('\n  ')}
  ${description
    .map((l, i) => `<text x="80" y="${240 + title.length * 78 + i * 46}" ${font} font-size="34" fill="#c3ced9">${escapeSvg(l)}</text>`)
    .join('\n  ')}
</svg>`;
}

export async function ogImages(): Promise<{ path: string; png: Buffer }[]> {
  return Promise.all(
    getPages().map(async (page) => ({
      path: page.ogImage.replace(/^\//, ''),
      png: await sharp(Buffer.from(ogSvg(page))).png().toBuffer(),
    })),
  );
}

/* -------------------------------------------------------------- redirects */

/**
 * Moved URLs, plus the site root: `/` sends readers to the docs root until the site has a
 * home page of its own — temporarily, hence 302.
 */
export function redirects(): { from: string; to: string; status: number }[] {
  return [...siteRedirects(), { from: `/`, to: `/${config.id}/`, status: 302 }];
}

/** A redirect a static host can serve on its own: it refreshes, and says where it is going. */
export function redirectHtml(to: string, from: string, site: URL): string {
  return (
    `<!doctype html><title>Redirecting to: ${escapeXml(to)}</title>` +
    `<meta http-equiv="refresh" content="0;url=${escapeXml(to)}">` +
    `<meta name="robots" content="noindex">` +
    `<link rel="canonical" href="${escapeXml(new URL(to, site).href)}">` +
    `<body><a href="${escapeXml(to)}">Redirecting from <code>${escapeXml(from)}</code> to <code>${escapeXml(to)}</code></a></body>`
  );
}

/** The `_redirects` file hosts read to answer with a real 301 instead of a refresh. */
export const redirectsFile = (): string => `${redirects().map((r) => `${r.from} ${r.to} ${r.status}`).join('\n')}\n`;

/* --------------------------------------------------------- generated files */

/** Every non-HTML file the site publishes, with the path it is served from. */
export function machineFiles(site: URL): GeneratedFile[] {
  return [
    { path: `${config.id}/llms.txt`, body: llmsTxt(site) },
    // Under both names tools look for.
    { path: `${config.id}/llms-full.md`, body: llmsFull(site) },
    { path: `${config.id}/llms-full.txt`, body: llmsFull(site) },
    { path: 'sitemap.xml', body: sitemapXml(site) },
    { path: 'robots.txt', body: robotsTxt(site) },
    { path: `${links.changelog.replace(/^\//, '')}rss.xml`, body: rssXml(site) },
    { path: '_redirects', body: redirectsFile() },
    ...twins(site),
  ];
}
