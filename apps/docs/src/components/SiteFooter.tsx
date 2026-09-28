/**
 * Shared footer. Column names are fixed; entries are only destinations
 * that exist.
 */
import { config, footerColumns, links } from '../lib/site';

export function SiteFooter() {
  const columns = footerColumns();
  const feed = `${links.changelog}rss.xml`;
  return (
    <footer className="site-footer">
      <div className="columns">
        {columns.map((column) => (
          <nav aria-label={column.title} key={column.title}>
            <p className="footer-title">{column.title}</p>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="legal">
        © 2026 kiralygyula92 · {config.name} is released under the{' '}
        <a href={`${config.repo}/blob/main/LICENSE`}>MIT License</a> · <a href={feed}>Changelog feed (RSS)</a>
      </p>
    </footer>
  );
}
