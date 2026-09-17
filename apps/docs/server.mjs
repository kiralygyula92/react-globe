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

const vite = await createServer({
  server: { port, strictPort: true },
  appType: 'custom',
});

vite.middlewares.use(async (req, res, next) => {
  const url = new URL(req.originalUrl ?? req.url ?? '/', site);
  // Anything with an extension is an asset request: Vite's own middleware answers it.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return next();

  try {
    const server = await vite.ssrLoadModule('/src/entry-server.tsx');
    const route = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    // In development the browser loads the client entry straight from source; the styles
    // come with it, so the head needs no stylesheet of its own.
    const html = await server.renderRoute(route, { site, assets: { css: [], js: ['/src/entry-client.tsx'] } });
    if (html === null) {
      const notFound = await server.renderRoute('/404', { site, assets: { css: [], js: ['/src/entry-client.tsx'] } });
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(url.pathname, notFound));
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml(url.pathname, html));
  } catch (error) {
    vite.ssrFixStacktrace(error);
    next(error);
  }
});

await vite.listen();
console.log(`  docs   http://localhost:${port}/react-globe/`);
