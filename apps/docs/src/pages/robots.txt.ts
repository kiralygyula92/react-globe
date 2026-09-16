/**
 * Crawling is open; the sitemap points crawlers at every page. Astro's redirect pages
 * carry their own `noindex`, so they need no rule here.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
