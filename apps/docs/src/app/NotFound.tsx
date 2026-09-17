/** Served by the host for any unknown path. Standalone: no nav data, so it cannot fail. */
import { config } from '../lib/site';
import type { Assets } from './DocsLayout';

const THEME_SCRIPT = `
      try {
        const theme = localStorage.getItem('react-globe-docs-theme');
        if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
      } catch {
        /* storage unavailable: follow the system preference */
      }
    `;

export function NotFound({ assets }: { assets: Assets }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <title>{`Page not found — ${config.name}`}</title>
        <meta name="robots" content="noindex" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.css.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
      </head>
      <body>
        <main id="main" className="not-found">
          <p className="not-found-code">404</p>
          <h1>Page not found</h1>
          <p>That page does not exist, or it has moved.</p>
          <p>
            <a href={`/${config.id}/`}>Go to the documentation</a> · <a href={`/${config.id}/all-features/`}>Browse the features</a>
          </p>
        </main>
      </body>
    </html>
  );
}
