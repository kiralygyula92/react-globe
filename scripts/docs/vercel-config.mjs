/**
 * Writes the vercel.json files from the same data the site builds from, so the host and
 * the build can never disagree about redirects.
 *
 *   node scripts/docs/vercel-config.mjs          regenerate
 *   node scripts/docs/vercel-config.mjs --check  exit 1 if either is out of date
 *
 * Two files, because Vercel reads the one inside the project's Root Directory and either
 * choice must produce the same site: the repository root (recommended) or apps/docs.
 * Vercel reads it before the build runs, so both are committed — a file written during
 * the build would arrive too late to take effect.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, siteRedirects } from './model.mjs';

/** Everything that does not depend on where the project root sits. */
const shared = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  installCommand: 'pnpm install --frozen-lockfile',
  // The site is built with Vite. Saying so is what makes Vercel hand the build its
  // VITE_-prefixed system variables, among them where the analytics endpoints live;
  // the build, install and output settings here override the preset's own.
  framework: 'vite',
  // The site is built as directory URLs; this makes the host agree instead of redirecting to the file.
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
        // No other site may frame these pages, so they cannot be dressed up for clickjacking.
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
    {
      // Hashed file names: safe to keep forever.
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // Rebuilt on every deploy under stable names, so they are revalidated.
      source: '/pagefind/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
    },
  ],
};

/** Paths and commands are relative to the Root Directory the project is configured with. */
const files = {
  // Root Directory: the repository root.
  'vercel.json': { buildCommand: 'pnpm docs:build', outputDirectory: 'apps/docs/dist' },
  // Root Directory: apps/docs. Its own build script builds the library first.
  'apps/docs/vercel.json': { buildCommand: 'pnpm build', outputDirectory: 'dist' },
};

const checking = process.argv.includes('--check');
let stale = 0;

for (const [file, { buildCommand, outputDirectory }] of Object.entries(files)) {
  const out = join(ROOT, file);
  const { $schema, ...rest } = shared;
  const text = `${JSON.stringify({ $schema, buildCommand, installCommand: rest.installCommand, outputDirectory, ...rest }, null, 2)}\n`;
  const current = (() => {
    try {
      return readFileSync(out, 'utf8');
    } catch {
      return null;
    }
  })();
  if (current === text) continue;
  if (checking) {
    console.error(`${file} is out of date — run \`pnpm docs:vercel\`.`);
    stale++;
  } else {
    writeFileSync(out, text);
    console.log(`wrote ${file}`);
  }
}

if (stale) process.exit(1);
if (checking) console.log('vercel.json files are current');
