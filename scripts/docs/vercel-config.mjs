/**
 * Writes vercel.json from the same data the site builds from, so the host and the
 * build can never disagree about redirects.
 *
 *   node scripts/docs/vercel-config.mjs          regenerate
 *   node scripts/docs/vercel-config.mjs --check  exit 1 if it is out of date
 *
 * Vercel reads vercel.json before the build runs, so it has to be committed: a file
 * written during the build would arrive too late to take effect.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, siteRedirects } from './model.mjs';

const OUT = join(ROOT, 'vercel.json');

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  // The docs consume the library's built output, so the library is built first.
  buildCommand: 'pnpm build && pnpm docs:build',
  installCommand: 'pnpm install --frozen-lockfile',
  outputDirectory: 'apps/docs/dist',
  framework: null,
  // Astro writes directory URLs; this makes the host agree instead of redirecting to the file.
  trailingSlash: true,
  redirects: [
    ...siteRedirects().map((r) => ({ source: r.from, destination: r.to, permanent: true })),
    // Temporary: the docs root stands in until the site has a home page of its own.
    { source: '/', destination: '/react-globe/', permanent: false },
  ],
  headers: [
    {
      // Modest defaults; no CSP, which the live demos' inline module scripts would trip over.
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // Hashed file names: safe to keep forever.
      source: '/_astro/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // Rebuilt on every deploy under stable names, so they are revalidated.
      source: '/pagefind/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
    },
  ],
};

const text = `${JSON.stringify(config, null, 2)}\n`;
const current = (() => {
  try {
    return readFileSync(OUT, 'utf8');
  } catch {
    return null;
  }
})();

if (process.argv.includes('--check')) {
  if (current !== text) {
    console.error('vercel.json is out of date — run `pnpm docs:vercel`.');
    process.exit(1);
  }
  console.log('vercel.json is current');
} else if (current === text) {
  console.log('vercel.json unchanged');
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
}
