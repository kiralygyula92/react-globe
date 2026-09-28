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
  OG_IMAGE,
  THEME_COLOR,
  config,
  featureGroups,
  getPages,
  links,
  referenceFor,
  referenceHref,
  referenceMarkdown,
  sectionTitle,
  shortDescription,
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

  if (page.kind === 'all-features') {
    for (const group of featureGroups()) {
      parts.push(`## ${group.group}`, group.pages.map((p) => `- [${p.title}](${new URL(p.twin, site).href}): ${p.description}`).join('\n'));
    }
  }

  const symbols = page.entry?.data.symbols ?? [];
  if (page.kind === 'feature') {
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
 * The globe itself, rendered once by the library and kept next to the app: every social image
 * shows the real thing rising from its bottom-right corner, not an icon of it.
 */
const OG_GLOBE = join(ROOT, 'apps', 'docs', 'og-globe.webp');
const GLOBE = { size: 520, left: 760, top: 250 };

/**
 * Generated social image for every docs page, built from the page's title and
 * description — never hand-made. An SVG template rasterised with sharp, the globe laid on top.
 * Text stays left of the globe: title lines above its shoulder, description lines beside it.
 */
export function ogSvg(page: Page): string {
  const title = wrap(page.heading, 22, 2);
  const description = wrap(shortDescription(page), 40, 4);
  const font = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE.width}" height="${OG_IMAGE.height}" viewBox="0 0 ${OG_IMAGE.width} ${OG_IMAGE.height}">
  <rect width="1200" height="630" fill="#0f1419"/>
  <rect width="1200" height="12" fill="${THEME_COLOR}"/>
  <text x="80" y="110" ${font} font-size="32" font-weight="600" fill="#9aa7b4">${escapeSvg(config.name)}</text>
  ${title.map((l, i) => `<text x="80" y="${210 + i * 76}" ${font} font-size="66" font-weight="700" fill="#e6edf3">${escapeSvg(l)}</text>`).join('\n  ')}
  ${description
    .map((l, i) => `<text x="80" y="${236 + title.length * 76 + i * 44}" ${font} font-size="32" fill="#c3ced9">${escapeSvg(l)}</text>`)
    .join('\n  ')}
</svg>`;
}

export async function ogImages(): Promise<{ path: string; png: Buffer }[]> {
  // Cropped to the part inside the card: sharp composites only what fits.
  const visible = { width: OG_IMAGE.width - GLOBE.left, height: OG_IMAGE.height - GLOBE.top };
  const globe = await sharp(OG_GLOBE)
    .resize(GLOBE.size)
    .extract({ left: 0, top: 0, width: Math.min(GLOBE.size, visible.width), height: Math.min(GLOBE.size, visible.height) })
    .toBuffer();
  return Promise.all(
    getPages().map(async (page) => ({
      path: page.ogImage.replace(/^\//, ''),
      png: await sharp(Buffer.from(ogSvg(page)))
        .composite([{ input: globe, left: GLOBE.left, top: GLOBE.top }])
        .png()
        .toBuffer(),
    })),
  );
}

/* ------------------------------------------------------------------ icons */

const FAVICON = join(ROOT, 'apps', 'docs', 'public', 'favicon.svg');
/** The favicon's own blue, so the touch icon's square reads as the same mark. */
const ICON_BACKGROUND = '#1d4ed8';

/** An .ico of PNG images, which every current browser reads. */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + images.length * 16);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const at = 6 + i * 16;
    head.writeUInt8(size, at);
    head.writeUInt8(size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((image) => image.png)]);
}

/**
 * The raster icons, drawn from favicon.svg so there is one icon to change: favicon.ico for
 * whatever asks for it by name (feed readers, link previews, older browsers), and the icon iOS
 * puts on the home screen, on a solid square because iOS fills transparency with black.
 */
export async function icons(): Promise<{ path: string; body: Buffer }[]> {
  const svg = readFileSync(FAVICON);
  const png = (size: number) => sharp(svg, { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();
  const sizes = [16, 32, 48];
  const favicon = ico(await Promise.all(sizes.map(async (size) => ({ size, png: await png(size) }))));
  const touch = await sharp(await png(156))
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: ICON_BACKGROUND })
    .flatten({ background: ICON_BACKGROUND })
    .png()
    .toBuffer();
  return [
    { path: 'favicon.ico', body: favicon },
    { path: 'apple-touch-icon.png', body: touch },
  ];
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
