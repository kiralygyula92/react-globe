/**
 * PPDS §7.7 `llms.txt`: `# {Plugin}`, a two-line description, then one `## {Section}`
 * per section listing every published page as `- [Title](url.md): description`.
 * Descriptions are the same field as each page's meta description and H1 subtitle (P10).
 */

import type { APIRoute } from 'astro';
import { config, getPages, sectionTitle } from '../../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const pages = await getPages();
  const lines = [`# ${config.name}`, '', `> ${config.tagline}`, `> ${config.description}`];
  let section: string | null = null;
  for (const page of pages) {
    if (page.section !== section) {
      section = page.section;
      lines.push('', `## ${sectionTitle(section)}`, '');
    }
    lines.push(`- [${page.title}](${new URL(page.twin, site).href}): ${page.description}`);
  }
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
