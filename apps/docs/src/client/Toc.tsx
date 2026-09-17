/**
 * Right rail: ToC from the article's H2/H3, with the section in view highlighted.
 * The highlight is enhancement; the links work without JavaScript.
 */
import { useEffect, useState } from 'react';
import type { Heading } from '../lib/props';

export function Toc({ headings }: { headings: Heading[] }) {
  const shown = headings.filter((h) => h.depth === 2 || h.depth === 3);
  // Before the reader scrolls, the first section is the one they are looking at.
  const [active, setActive] = useState(shown[0]?.slug);

  useEffect(() => {
    if (shown.length === 0 || !('IntersectionObserver' in window)) return;
    const order = shown.map((h) => h.slug);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Nothing in view keeps the last heading passed, so the rail never goes blank.
        setActive((last) => order.find((id) => visible.has(id)) ?? last);
      },
      { rootMargin: '-10% 0px -70% 0px' },
    );
    for (const id of order) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
    // The headings of a page never change while it is open.
  }, []);

  return (
    <>
      {shown.length > 0 && (
        <nav aria-labelledby="toc-title">
          <p className="toc-title" id="toc-title">
            On this page
          </p>
          <ul>
            {shown.map((h) => (
              <li className={`depth-${h.depth}`} key={h.slug}>
                <a href={`#${h.slug}`} className={h.slug === active ? 'active' : undefined}>
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
