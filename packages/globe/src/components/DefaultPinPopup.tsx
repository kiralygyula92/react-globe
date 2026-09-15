/**
 * The built-in pin popup. Reads `Pin.data` by convention: title from `title`,
 * `name` or `label`, falling back to the pin's id; subtitle from `subtitle`,
 * `description` or `caption`.
 */

import type { PinPopupRenderProps } from '../types';

const pick = (data: unknown, keys: readonly string[]): string | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
};

const CARD = {
  background: 'var(--globe-surface-card, rgb(255 255 255))',
  border: '1px solid var(--globe-border-strong, rgb(0 0 0 / 0.12))',
  borderRadius: 'var(--globe-r-md, 0.625rem)',
  boxShadow: 'var(--globe-shadow-lg, 0 12px 32px rgb(0 0 0 / 0.3))',
} as const;

export function DefaultPinPopup<TData>({ pin }: PinPopupRenderProps<TData>) {
  const title = pick(pin.data, ['title', 'name', 'label']) ?? pin.id;
  const subtitle = pick(pin.data, ['subtitle', 'description', 'caption']);
  return (
    <div className="rg:pointer-events-none rg:min-w-32 rg:max-w-60 rg:px-3 rg:py-2" style={CARD}>
      <p className="rg:m-0 rg:text-sm rg:leading-tight rg:font-semibold" style={{ color: 'var(--globe-text-primary, rgb(17 37 58))' }}>
        {title}
      </p>
      {subtitle !== null && (
        <p className="rg:m-0 rg:mt-0.5 rg:text-xs rg:leading-tight" style={{ color: 'var(--globe-text-secondary, rgb(60 90 114))' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
