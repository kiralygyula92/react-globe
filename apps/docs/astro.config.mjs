/**
 * PPDS docs site for react-globe.
 *
 * Static output with directory URLs and a trailing slash (R4). Redirects come from
 * docs/migration/url-map.csv, never from this file: Astro emits a meta-refresh page
 * for each (so a plain static host still lands the reader) and the build hook
 * writes `_redirects` so a host that reads it answers with a real 301 (R6).
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
import { CONTENT_DIR, ROOT, siteRedirects } from '../../scripts/ppds/model.mjs';
import { remarkPpds } from './src/lib/remark-ppds.mjs';

/** Production origin is not decided yet (GAPS G-02); override with DOCS_SITE_URL. */
const SITE = process.env.DOCS_SITE_URL ?? 'http://localhost:4321';

/**
 * url-map rows, plus the site root: there is no marketing surface yet (EXCEPTIONS E-02),
 * so `/` sends readers to the docs root until there is one — temporarily, hence 302.
 */
const redirects = [...siteRedirects(), { from: '/', to: '/react-globe/', status: 302 }];

function hostRedirects() {
  return {
    name: 'ppds-host-redirects',
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
    remarkPlugins: [remarkDirective, [remarkPpds, { contentDir: CONTENT_DIR }]],
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
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
