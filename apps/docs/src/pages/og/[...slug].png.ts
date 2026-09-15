/**
 * PPDS §7.6 generated social image for every docs page, built from the page's title
 * and description — never hand-made. An SVG template rasterised with sharp.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { THEME_COLOR, config, getPages, type Page } from '../../lib/site';

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getPages();
  return pages.map((page) => ({ params: { slug: page.ogImage.replace(/^\/og\//, '').replace(/\.png$/, '') }, props: { page } }));
};

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

export const GET: APIRoute<{ page: Page }> = async ({ props }) => {
  const { page } = props;
  const title = wrap(page.heading, 28, 2);
  const description = wrap(page.description, 58, 3);
  const font = "font-family=\"Segoe UI, Helvetica, Arial, sans-serif\"";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f1419"/>
  <rect width="1200" height="12" fill="${THEME_COLOR}"/>
  <g fill="none" stroke="${THEME_COLOR}" stroke-width="6" transform="translate(1010 150)">
    <circle r="110"/><ellipse rx="44" ry="110"/><line x1="-110" x2="110"/>
  </g>
  <text x="80" y="110" ${font} font-size="34" font-weight="600" fill="#9aa7b4">${escape(config.name)}</text>
  ${title.map((l, i) => `<text x="80" y="${220 + i * 78}" ${font} font-size="68" font-weight="700" fill="#e6edf3">${escape(l)}</text>`).join('\n  ')}
  ${description
    .map((l, i) => `<text x="80" y="${240 + title.length * 78 + i * 46}" ${font} font-size="34" fill="#c3ced9">${escape(l)}</text>`)
    .join('\n  ')}
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
