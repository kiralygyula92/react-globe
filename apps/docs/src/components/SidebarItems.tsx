/**
 * The sidebar tree, recursively, exactly as the nav data orders and groups it. Sections are
 * collapsible <details>: the one holding the current page starts open, the rest closed.
 * Works without JavaScript and announces its expanded state to assistive technology.
 */
import type { SidebarItem } from '../lib/site';
import { Badge } from './Badge';

const contains = (item: SidebarItem, current: string): boolean =>
  item.kind === 'link' ? item.href === current : item.items.some((child) => contains(child, current));

export function SidebarItems({ items, current, depth }: { items: SidebarItem[]; current: string; depth: number }) {
  return (
    <ul className={`nav-list depth-${depth}`}>
      {items.map((item, i) =>
        item.kind === 'section' ? (
          <li className="nav-section" key={i}>
            {item.items.length > 0 ? (
              <details open={contains(item, current)}>
                <summary className="section-title">{item.title}</summary>
                <SidebarItems items={item.items} current={current} depth={depth + 1} />
              </details>
            ) : (
              <p className="section-title is-empty">{item.title}</p>
            )}
          </li>
        ) : item.kind === 'group' ? (
          <li className="nav-group" key={i}>
            <p className="group-title">{item.title}</p>
            <SidebarItems items={item.items} current={current} depth={depth + 1} />
          </li>
        ) : (
          <li key={i}>
            <a
              className="nav-link"
              href={item.href}
              title={item.description ?? undefined}
              aria-current={item.href === current ? 'page' : undefined}
            >
              {item.code ? <code className="symbol">{item.title}</code> : <span>{item.title}</span>}
              {item.badges.map((badge, b) => (
                <Badge badge={badge} key={b} />
              ))}
            </a>
          </li>
        ),
      )}
    </ul>
  );
}
