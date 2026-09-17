/**
 * Renders the site to `dist/`: an HTML file per route, the Markdown twin of every page,
 * llms.txt, the sitemap, robots.txt, the changelog feed, a social image per page and the
 * redirects, both as pages a plain host can serve and as the `_redirects` file.
 *
 * Runs after the two Vite builds: the client bundle (which this reads asset names from)
 * and the server bundle (whose components render the HTML).
 *
 *   node build.mjs
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siteUrl } from './site-url.mjs';

const APP = dirname(fileURLToPath(import.meta.url));
const DIST = join(APP, 'dist');

const write = (path, body) => {
  const full = join(DIST, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
};

/** The hashed client bundle and stylesheet Vite just built, from its manifest. */
function assets() {
  const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'));
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry) throw new Error('[docs] the client build produced no entry chunk');
  return { js: [`/${entry.file}`], css: (entry.css ?? []).map((file) => `/${file}`) };
}

const site = siteUrl();
const server = await import(pathToFileURL(join(APP, 'dist-ssr', 'entry-server.js')).href);
const bundle = assets();

let pages = 0;
for (const route of server.routes()) {
  const html = await server.renderRoute(route, { site, assets: bundle });
  if (html === null) throw new Error(`[docs] no page for route ${route}`);
  write(server.filePathFor(route), html);
  pages++;
}

const files = server.machineFiles(site);
for (const { path, body } of files) write(path, body);

const redirects = server.redirects();
for (const redirect of redirects) {
  const directory = redirect.from.replace(/^\/|\/$/g, '');
  write(directory ? `${directory}/index.html` : 'index.html', server.redirectHtml(redirect.to, redirect.from, site));
}

console.log(`[docs] ${pages} page(s), ${files.length} generated file(s) and ${redirects.length} redirect(s) written to dist/`);

// The manifest is how this script found the bundle; it is not part of the site.
rmSync(join(DIST, '.vite'), { recursive: true, force: true });

const images = await server.ogImages();
for (const image of images) write(image.path, image.png);
console.log(`[docs] ${images.length} social image(s) written`);
