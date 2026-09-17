/**
 * Canonical origin. DOCS_SITE_URL wins; on Vercel the project's production domain is used
 * (so previews still declare the canonical production URL), and locally it is the dev server.
 */
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return new URL(process.env.DOCS_SITE_URL ?? (host ? `https://${host}` : 'http://localhost:4321'));
}
