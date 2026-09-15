/**
 * RSS feed for the changelog. One item per version section of
 * packages/globe/CHANGELOG.md, the same file the Changelog page includes, so the feed and
 * the page can never disagree. A section without a release date has no pubDate.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { ROOT } from '../../../../../../../scripts/docs/model.mjs';
import { config, links } from '../../../../lib/site';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

export const GET: APIRoute = ({ site }) => {
  const changelog = readFileSync(join(ROOT, 'packages', 'globe', 'CHANGELOG.md'), 'utf8');
  const page = new URL(links.changelog, site).href;
  const items = releases(changelog).map(
    (r) => `    <item>
      <title>${escape(`${config.name} ${r.version}${r.date ? '' : ' (unreleased)'}`)}</title>
      <link>${escape(page)}</link>
      <guid isPermaLink="false">${escape(`${config.id}@${r.version}`)}</guid>${r.date ? `\n      <pubDate>${new Date(`${r.date}T00:00:00Z`).toUTCString()}</pubDate>` : ''}
      <description><![CDATA[${r.body.replace(/]]>/g, ']]]]><![CDATA[>')}]]></description>
    </item>`,
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${config.name} changelog`)}</title>
    <link>${escape(page)}</link>
    <atom:link href="${escape(new URL('rss.xml', page).href)}" rel="self" type="application/rss+xml" />
    <description>${escape(config.tagline)}</description>
    <language>en</language>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
