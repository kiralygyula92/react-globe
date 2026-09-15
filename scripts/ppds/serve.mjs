/**
 * A static server for the built docs that behaves like a typical static host:
 * `_redirects` rules answer with their status and a Location, a directory without
 * its trailing slash 301s to it, `dir/` serves `dir/index.html`, anything else 404s.
 *
 *   node scripts/ppds/serve.mjs [dist] [port]
 *
 * Used by the conformance script so redirects are verified over HTTP, not by
 * reading configuration.
 */

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readRedirects(dist) {
  const file = join(dist, '_redirects');
  if (!existsSync(file)) return new Map();
  return new Map(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const [from, to, status = '301'] = l.split(/\s+/);
        return [from, { to, status: Number(status) }];
      }),
  );
}

export function startServer(dist, port = 0) {
  const root = resolve(dist);
  const redirects = readRedirects(root);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }

    const rule = redirects.get(pathname);
    if (rule) {
      res.writeHead(rule.status, { Location: rule.to }).end();
      return;
    }

    const target = normalize(join(root, pathname));
    if (!target.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }

    let file = target;
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: `${pathname}/` }).end();
        return;
      }
      file = join(file, 'index.html');
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  });

  return new Promise((resolveStart) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      resolveStart({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dist = process.argv[2] ?? 'apps/docs/dist';
  const port = Number(process.argv[3] ?? 4321);
  const { origin } = await startServer(dist, port);
  console.log(`serving ${resolve(dist)} at ${origin}`);
}
