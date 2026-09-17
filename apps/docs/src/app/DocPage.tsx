/**
 * Every authored docs page. The route list is nav.json's pages; the archetype decides which
 * data-driven blocks surround the authored Markdown.
 */
import { Badge } from '../components/Badge';
import { PageActions } from '../components/PageActions';
import type { Heading } from '../lib/props';
import { featureGroups, referenceHref, resourceChips, type Page } from '../lib/site';
import { DocsLayout, type Assets } from './DocsLayout';

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The headings the right rail lists: the authored ones plus the blocks the template adds. */
export function docHeadings(page: Page, authored: Heading[]): Heading[] {
  const groups = page.archetype === 'C' ? featureGroups() : [];
  return [
    ...authored,
    ...(page.archetype === 'B' ? [{ depth: 2, slug: 'api', text: 'API' }] : []),
    ...groups.map((g) => ({ depth: 2, slug: slug(g.group), text: g.group })),
  ];
}

export function DocPage({ page, html, headings, site, assets }: { page: Page; html: string; headings: Heading[]; site: URL; assets: Assets }) {
  const entry = page.entry!;
  const symbols = entry.data.symbols ?? [];
  const groups = page.archetype === 'C' ? featureGroups() : [];
  const date = entry.data.date;

  return (
    <DocsLayout page={page} headings={headings} site={site} assets={assets}>
      <article className="article">
        <header className="page-header">
          <h1>
            {page.heading}
            {page.badges.length > 0 && (
              <span className="heading-badges">
                {page.badges.map((badge, i) => (
                  <Badge badge={badge} key={i} />
                ))}
              </span>
            )}
          </h1>
          {page.archetype === 'I' && date && (
            <time className="page-date" dateTime={date.toISOString().slice(0, 10)}>
              {date.toISOString().slice(0, 10)}
            </time>
          )}
          <p className="page-subtitle">{page.description}</p>
        </header>

        {page.archetype === 'B' && (
          <ul className="resource-chips" aria-label="Resources">
            {resourceChips(entry).map((chip) => (
              <li key={chip.key}>
                <a href={chip.href}>{chip.label}</a>
              </li>
            ))}
          </ul>
        )}

        <div dangerouslySetInnerHTML={{ __html: html }} />

        {page.archetype === 'C' && (
          <div>
            {groups.map((g) => (
              <section key={g.group}>
                <h2 id={slug(g.group)}>{g.group}</h2>
                <ul className="feature-cards">
                  {g.pages.map((p) => (
                    <li key={p.pathname}>
                      <a className="feature-card" href={p.pathname}>
                        <span className="name">{p.title}</span>
                        {p.badges.map((badge, i) => (
                          <Badge badge={badge} key={i} />
                        ))}
                        <span className="one-line">{p.description}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {page.archetype === 'B' && (
          <section className="api-links">
            <h2 id="api">API</h2>
            <ul>
              {symbols.map((symbol) => {
                const href = referenceHref(symbol);
                return (
                  <li key={symbol}>
                    {href ? (
                      <a href={href}>
                        <code>{symbol}</code>
                      </a>
                    ) : (
                      <code>{symbol}</code>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <PageActions page={page} />
      </article>
    </DocsLayout>
  );
}
