/**
 * Development server: Vite in middleware mode, with every request rendered by the same
 * components the build uses. Editing a component, a stylesheet or a page's Markdown is
 * reflected on the next request; the live demos hot-reload as usual.
 *
 *   node server.mjs [--port 4321]
 */

import { createServer } from 'vite';
import { siteUrl } from './site-url.mjs';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};

const port = Number(arg('port', 4321));
const site = siteUrl();

/** In development the browser loads the client entry from source, styles included. */
const ASSETS = { css: [], js: ['/src/entry-client.tsx'] };

const renderPage = (server) => async (req, res, next) => {
  const url = new URL(req.originalUrl ?? req.url ?? '/', site);
  // Anything with an extension is an asset request: Vite's own middleware answers it.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return next();

  try {
    const entry = await server.ssrLoadModule('/src/entry-server.tsx');
    const route = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    const page = await entry.renderRoute(route, { site, assets: ASSETS });
    const html = page ?? (await entry.renderRoute('/404', { site, assets: ASSETS }));
    res.statusCode = page ? 200 : 404;
    res.setHeader('Content-Type', 'text/html');
    res.end(await server.transformIndexHtml(url.pathname, html));
  } catch (error) {
    server.ssrFixStacktrace(error);
    next(error);
  }
};

/**
 * Registered as a plugin rather than on the server object, because Vite restarts itself
 * when the config changes: a plugin's `configureServer` runs again on the new server,
 * while middleware added to the old one would be gone and every request would 404.
 *
 * The hook returns its work instead of doing it, which installs this after Vite's own
 * middlewares — they own the module graph and paths like `/@vite/client`, which carry no
 * file extension and would otherwise be taken for pages.
 */
const docsPages = {
  name: 'docs-render-pages',
  configureServer(server) {
    return () => {
      server.middlewares.use(renderPage(server));
    };
  },
};

const vite = await createServer({
  server: { port, strictPort: true },
  appType: 'custom',
  plugins: [docsPages],
});

await vite.listen();
console.log(`  docs   http://localhost:${port}/react-globe/`);
