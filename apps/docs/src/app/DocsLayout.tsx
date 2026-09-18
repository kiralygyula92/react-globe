/**
 * Every docs page: announcement bar → header (product name, version selector,
 * search, repository link, theme switch) → sidebar · content · right rail → shared footer.
 * Metadata comes from one title and one description.
 *
 * The whole document is rendered here at build time; the browser takes over the header and
 * the right rail, whose data travels with the page in a small JSON script.
 */
import type { ReactNode } from 'react';
import { SidebarItems } from '../components/SidebarItems';
import { SiteFooter } from '../components/SiteFooter';
import { Header } from '../client/Header';
import { Toc } from '../client/Toc';
import type { Heading, PageData } from '../lib/props';
import { breadcrumbs, config, currentVersion, links, metadata, sidebar, type Page } from '../lib/site';

/** Applied before first paint, so a reader who chose a theme never sees a flash of the other. */
const THEME_SCRIPT = `
      // Apply a stored theme before first paint, so a reader who chose one never sees a flash of the other.
      try {
        const theme = localStorage.getItem('react-globe-docs-theme');
        if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
      } catch {
        /* storage unavailable: follow the system preference */
      }
    `;

export type Assets = { css: string[]; js: string[] };

export function headerProps(): PageData['header'] {
  return {
    name: config.name,
    repo: config.repo,
    versions: (config.versions ?? []).map((v) => ({ label: v.label, href: v.href })),
    currentVersion: currentVersion().label,
    versionsHref: `/${config.id}/getting-started/versions/`,
  };
}

export function DocsLayout({
  page,
  headings,
  site,
  assets,
  children,
}: {
  page: Page;
  headings: Heading[];
  site: URL;
  assets: Assets;
  children: ReactNode;
}) {
  const meta = metadata(page, site);
  const nav = sidebar();
  const crumbs = breadcrumbs(page);
  const data: PageData = { header: headerProps(), headings };
  /** No announcement is configured; the bar renders only when there is one. */
  const announcement: string | null = null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <title>{meta.documentTitle}</title>
        <link rel="canonical" href={meta.canonical} />
        {meta.meta.map((m) =>
          'property' in m ? <meta property={m.property} content={m.content} key={m.property} /> : <meta name={m.name} content={m.content} key={m.name} />,
        )}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate" type="text/markdown" href={page.twin} />
        <link rel="alternate" type="application/rss+xml" title={`${config.name} changelog`} href={`${links.changelog}rss.xml`} />
        <link rel="sitemap" href="/sitemap.xml" />
        {(config.versions ?? []).length > 1 && <meta data-pagefind-filter="version[content]" content={currentVersion().label} />}
        {assets.css.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
        {assets.js.map((src) => (
          <script type="module" src={src} key={src}></script>
        ))}
      </head>
      <body data-pathname={page.pathname}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {announcement && (
          <div className="announcement" role="region" aria-label="Announcement">
            {announcement}
          </div>
        )}

        <header className="site-header">
          <div className="header-inner">
            <Header {...data.header} />
          </div>
        </header>

        {/* Not restored by the browser on Back: the menu should come back closed. */}
        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-hidden="true" tabIndex={-1} autoComplete="off" />
        <div className="docs-shell">
          <nav className="sidebar" id="docs-sidebar" aria-label="Documentation">
            <SidebarItems items={nav} current={page.pathname} depth={1} />
          </nav>

          <main id="main" tabIndex={-1} data-pagefind-body>
            <nav className="breadcrumb" aria-label="Breadcrumb" data-pagefind-ignore>
              <ol>
                {crumbs.map((crumb, i) => (
                  <li key={i}>{crumb.href ? <a href={crumb.href}>{crumb.title}</a> : <span>{crumb.title}</span>}</li>
                ))}
              </ol>
            </nav>
            {children}
          </main>

          <aside className="toc" aria-label="On this page">
            <Toc headings={headings} />
          </aside>
        </div>

        <SiteFooter />
        {/* `<` is escaped so a string in the data can never close this script element. */}
        <script type="application/json" id="docs-data" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  );
}
