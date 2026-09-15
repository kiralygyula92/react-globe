/**
 * PPDS §7.7 Markdown twin of every docs page: the heading, the one-line description,
 * the authored Markdown, and the data-driven blocks the HTML page renders (API links,
 * feature groups). Generated reference for the page's symbols is appended in Phase 4.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { config, featureGroups, getPages, referenceHref, symbolPath, type Page } from '../../lib/site';

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getPages();
  return pages.map((page) => ({
    params: { twin: page.twin.slice(`/${config.id}/`.length).replace(/\.md$/, '') },
    props: { page },
  }));
};

/** Authoring comments (TODOs, porting hints) are for editors, not readers. */
const stripComments = (markdown: string): string => markdown.replace(/<!--[\s\S]*?-->\n?/g, '').trim();

export const GET: APIRoute<{ page: Page }> = async ({ props, site }) => {
  const { page } = props;
  const parts = [`# ${page.heading}`, page.description];
  const body = stripComments(page.entry.body ?? '');
  if (body) parts.push(body);

  if (page.archetype === 'C') {
    for (const group of await featureGroups()) {
      parts.push(`## ${group.group}`, group.pages.map((p) => `- [${p.title}](${new URL(p.twin, site).href}): ${p.description}`).join('\n'));
    }
  }
  if (page.archetype === 'B') {
    const symbols = page.entry.data.symbols ?? [];
    parts.push(
      '## API',
      symbols
        .map((symbol) => (referenceHref(symbol) ? `- [\`${symbol}\`](${new URL(symbolPath(symbol, config), site).href})` : `- \`${symbol}\``))
        .join('\n'),
    );
  }
  return new Response(`${parts.join('\n\n')}\n`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
