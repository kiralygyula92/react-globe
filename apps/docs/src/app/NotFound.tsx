/**
 * Served by the host for any unknown path, in the same frame as every page: the header with
 * search, the full navigation and the footer, so a reader who followed a dead link can carry on
 * from where they landed instead of starting over.
 */
import { SidebarItems } from '../components/SidebarItems';
import { SiteFooter } from '../components/SiteFooter';
import { Header } from '../client/Header';
import type { PageData } from '../lib/props';
import { config, sidebar, titles } from '../lib/site';
import { SiteHeadLinks, THEME_SCRIPT, headerProps, type Assets } from './DocsLayout';

/** Where most readers were heading. */
const START_HERE = ['getting-started/installation/', 'all-features/', 'demos/playground/', 'getting-started/usage/'];

export function NotFound({ assets }: { assets: Assets }) {
  const data: PageData = { header: headerProps(), headings: [] };
  const links = START_HERE.map((path) => `/${config.id}/${path}`).map((href) => ({ href, title: titles[href] }));

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <SiteHeadLinks />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <title>{`Page not found — ${config.name}`}</title>
        <meta name="robots" content="noindex" />
        {assets.css.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
        {assets.js.map((src) => (
          <script type="module" src={src} key={src}></script>
        ))}
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Header {...data.header} />
          </div>
        </header>

        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-hidden="true" tabIndex={-1} autoComplete="off" />
        <div className="docs-shell">
          <nav className="sidebar" id="docs-sidebar" aria-label="Documentation">
            <SidebarItems items={sidebar()} current="" depth={1} />
          </nav>

          <main id="main" tabIndex={-1} className="not-found">
            <p className="not-found-code">404</p>
            <h1>Page not found</h1>
            <p>That page does not exist, or it has moved. Search the documentation, or pick up from one of these:</p>
            <ul className="not-found-links">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.title}</a>
                </li>
              ))}
            </ul>
          </main>
        </div>

        <SiteFooter />
        {/* The header is taken over in the browser like on every page: search and the theme switch work here too. */}
        <script type="application/json" id="docs-data" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  );
}
