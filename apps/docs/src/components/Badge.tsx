/** One badge, rendered only from a nav node's plan or lifecycle. */
import type { Badge as BadgeData } from '../lib/props';

export function Badge({ badge }: { badge: BadgeData }) {
  return badge.href ? (
    <a className="badge" href={badge.href}>
      {badge.label}
    </a>
  ) : (
    <span className="badge">{badge.label}</span>
  );
}
