/**
 * Sitemap of every docs page.
 */

import type { APIRoute } from 'astro';
import { getPages } from '../lib/site';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = async ({ site }) => {
  const pages = await getPages();
  const urls = pages.map((p) => `  <url><loc>${escape(new URL(p.pathname, site).href)}</loc></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
