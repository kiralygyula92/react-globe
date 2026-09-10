/** The cursor tooltip naming the hovered country. Positioned by its parent, not by React. */

import type { Ref } from 'react';

const STYLE = {
  background: 'var(--globe-space-800, rgb(11 16 38))',
  color: 'var(--globe-paper-100, rgb(247 251 253))',
  borderRadius: 'var(--globe-r-sm, 0.375rem)',
  boxShadow: 'var(--globe-shadow-md, 0 4px 12px rgb(0 0 0 / 0.28))',
  visibility: 'hidden',
} as const;

export function CountryTooltip({ name, elementRef }: { name: string; elementRef: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={elementRef}
      className="wg:absolute wg:left-0 wg:top-0 wg:whitespace-nowrap wg:px-2 wg:py-1 wg:text-xs wg:font-medium wg:will-change-transform"
      style={STYLE}
    >
      {name}
    </div>
  );
}
