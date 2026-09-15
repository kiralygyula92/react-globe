/**
 * Markdown twin of every docs page: the heading, the one-line description,
 * the authored Markdown, the data-driven blocks the HTML page renders (feature
 * groups, API links), and the generated reference for the page's symbols.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { CONTENT_DIR } from '../../../../../scripts/docs/model.mjs';
import { demosAsCode, includesAsMarkdown } from '../../lib/remark-docs.mjs';
import { config, featureGroups, getPages, referenceFor, referenceHref, referenceMarkdown, symbolPath, type Page } from '../../lib/site';

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getPages();
  return pages.map((page) => ({
    params: { twin: page.twin.slice(`/${config.id}/`.length).replace(/\.md$/, '') },
    props: { page },
  }));
};

/** Authoring comments (TODOs, porting hints) and demo directives' source paths are for editors, not readers. */
const stripComments = (markdown: string): string => markdown.replace(/<!--[\s\S]*?-->\n?/g, '').trim();

const markdown = (parts: string[]) =>
  new Response(`${parts.filter(Boolean).join('\n\n')}\n`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });

export const GET: APIRoute<{ page: Page }> = async ({ props, site }) => {
  const { page } = props;
  const parts = [`# ${page.heading}`, page.description];

  if (page.reference) {
    parts.push(referenceMarkdown(page.reference, site));
    return markdown(parts);
  }

  parts.push(includesAsMarkdown(demosAsCode(stripComments(page.entry?.body ?? ''), page.file, CONTENT_DIR), page.file, CONTENT_DIR));

  if (page.archetype === 'C') {
    for (const group of await featureGroups()) {
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
  for (const symbol of symbols) {
    const ref = referenceFor(symbol);
    if (ref) parts.push(`## ${symbol} reference`, referenceMarkdown(ref, site, 3));
  }
  return markdown(parts);
};
