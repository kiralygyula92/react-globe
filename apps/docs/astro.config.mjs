/**
 * Docs site for react-globe.
 *
 * Static output with directory URLs and a trailing slash. Redirects come from
 * content/react-globe/redirects.json: Astro emits a meta-refresh page for each (so a
 * plain static host still lands the reader) and the build hook writes `_redirects`
 * so a host that reads it answers with a real 301. Vercel reads the same list from
 * vercel.json, which scripts/docs/vercel-config.mjs generates.
 *
 * Live demos are demo-*.tsx files colocated with their pages under content/; the
 * React integration compiles them and `resolve.dedupe` makes their bare imports
 * (react, react-globe, three) resolve from this app, not from the content folder.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import { CONTENT_DIR, ROOT, siteRedirects } from '../../scripts/docs/model.mjs';
import { remarkDocs } from './src/lib/remark-docs.mjs';

/**
 * Canonical origin. DOCS_SITE_URL wins; on Vercel the project's production domain is used
 * (so previews still declare the canonical production URL), and locally it is the dev server.
 */
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const SITE = process.env.DOCS_SITE_URL ?? (host ? `https://${host}` : 'http://localhost:4321');

/**
 * Moved URLs, plus the site root: `/` sends readers to the docs root until the site has a
 * home page of its own — temporarily, hence 302.
 */
const redirects = [...siteRedirects(), { from: '/', to: '/react-globe/', status: 302 }];

function hostRedirects() {
  return {
    name: 'host-redirects',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const lines = redirects.map((r) => `${r.from} ${r.to} ${r.status}`);
        writeFileSync(new URL('_redirects', dir), `${lines.join('\n')}\n`);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  output: 'static',
  redirects: Object.fromEntries(redirects.map((r) => [r.from, { destination: r.to, status: r.status }])),
  integrations: [react({ include: ['**/*.tsx'] }), hostRedirects()],
  markdown: {
    remarkPlugins: [remarkDirective, [remarkDocs, { contentDir: CONTENT_DIR }]],
    shikiConfig: { themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } },
  },
  vite: {
    resolve: { dedupe: ['react', 'react-dom', 'three', 'react-globe'] },
    // three.js alone exceeds Vite's 500 kB warning; it loads lazily, only on pages with demos.
    build: { chunkSizeWarningLimit: 900 },
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/lines/Line2.js',
        'three/examples/jsm/lines/LineGeometry.js',
        'three/examples/jsm/lines/LineMaterial.js',
        'three/examples/jsm/lines/LineSegments2.js',
        'three/examples/jsm/lines/LineSegmentsGeometry.js',
      ],
    },
    // Content, nav data and the shared model live outside the app.
    server: { fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), ROOT] } },
  },
});
