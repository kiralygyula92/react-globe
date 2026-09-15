/** The cursor tooltip naming the hovered country. Positioned by its parent, not by React. */

import type { Ref } from 'react';

const STYLE = {
  background: 'var(--globe-color-tooltip, rgb(11 16 38))',
  color: 'var(--globe-color-label, rgb(247 251 253))',
  borderRadius: 'var(--globe-r-sm, 0.375rem)',
  boxShadow: 'var(--globe-shadow-md, 0 4px 12px rgb(0 0 0 / 0.28))',
  visibility: 'hidden',
} as const;

export function CountryTooltip({ name, elementRef }: { name: string; elementRef: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={elementRef}
      className="rg:absolute rg:left-0 rg:top-0 rg:whitespace-nowrap rg:px-2 rg:py-1 rg:text-xs rg:font-medium rg:will-change-transform"
      style={STYLE}
    >
      {name}
    </div>
  );
}
