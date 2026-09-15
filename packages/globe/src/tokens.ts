/**
 * The theme tokens: every CSS custom property the built-in components read, with the
 * literal fallback each use applies when the property is not set.
 *
 * Components keep their `var(--globe-…, fallback)` literals (Tailwind has to see the
 * arbitrary-value classes in source), so this list does not feed them. Instead
 * `tokens.spec.ts` scans the components and fails when a token, a use or a fallback
 * differs from this manifest — which makes it safe to generate documentation from.
 */

/** Where one token is read, and the value used when it is not set. */
export type GlobeThemeTokenUsage = {
  /** The built-in element that reads the token. */
  element: 'Capital marker' | 'Country label' | 'Country tooltip' | 'Cluster marker' | 'Controls' | 'Pin popup' | 'Graticule label';
  /** The CSS property the token sets. */
  property: string;
  /** Applied when the token is not defined on an ancestor. */
  fallback: string;
};

/** One theme token: a CSS custom property the built-in components read. */
export type GlobeThemeToken = {
  /** The custom property name, including the leading dashes. */
  name: `--globe-${string}`;
  /** What the token controls. */
  description: string;
  /** Every place the token is read, each with its own fallback. */
  usages: readonly GlobeThemeTokenUsage[];
};

/**
 * Every CSS custom property the built-in components read. Set any of them on an
 * ancestor of the globe to theme it; each use falls back to a literal when unset.
 */
export const GLOBE_THEME_TOKENS: readonly GlobeThemeToken[] = Object.freeze([
  {
    name: '--globe-color-label',
    description: 'Text on the globe: country and capital names, graticule labels, tooltip text and control icons.',
    usages: [
      { element: 'Country label', property: 'color', fallback: 'rgb(247 251 253)' },
      { element: 'Capital marker', property: 'color', fallback: 'rgb(247 251 253)' },
      { element: 'Graticule label', property: 'color', fallback: 'rgb(247 251 253)' },
      { element: 'Country tooltip', property: 'color', fallback: 'rgb(247 251 253)' },
      { element: 'Controls', property: 'color', fallback: 'rgb(247 251 253)' },
    ],
  },
  {
    name: '--globe-color-accent',
    description: 'Accent: the capital dot and focus outlines.',
    usages: [
      { element: 'Capital marker', property: 'background', fallback: 'rgb(63 224 197)' },
      { element: 'Cluster marker', property: 'outline-color', fallback: 'rgb(63 224 197)' },
      { element: 'Controls', property: 'outline-color', fallback: 'rgb(63 224 197)' },
    ],
  },
  {
    name: '--globe-color-outline',
    description: 'Outline around markers: the capital dot ring and the cluster border.',
    usages: [
      { element: 'Capital marker', property: 'box-shadow', fallback: 'rgb(255 255 255)' },
      { element: 'Cluster marker', property: 'border-color', fallback: 'rgb(255 255 255)' },
    ],
  },
  {
    name: '--globe-color-cluster',
    description: 'Cluster marker fill.',
    usages: [{ element: 'Cluster marker', property: 'background', fallback: 'rgb(255 181 61)' }],
  },
  {
    name: '--globe-color-cluster-hover',
    description: 'Cluster marker fill while hovered.',
    usages: [{ element: 'Cluster marker', property: 'background', fallback: 'rgb(255 226 172)' }],
  },
  {
    name: '--globe-color-cluster-text',
    description: 'Cluster marker count.',
    usages: [{ element: 'Cluster marker', property: 'color', fallback: 'rgb(17 37 58)' }],
  },
  {
    name: '--globe-color-tooltip',
    description: 'Country tooltip background.',
    usages: [{ element: 'Country tooltip', property: 'background', fallback: 'rgb(11 16 38)' }],
  },
  {
    name: '--globe-surface-card',
    description: 'Raised surfaces: the pin popup and the control buttons.',
    usages: [
      { element: 'Pin popup', property: 'background', fallback: 'rgb(255 255 255)' },
      { element: 'Controls', property: 'background', fallback: 'rgb(15 18 38 / 0.72)' },
    ],
  },
  {
    name: '--globe-surface-sunken',
    description: 'Control button background while hovered.',
    usages: [{ element: 'Controls', property: 'background', fallback: 'rgb(35 42 78 / 0.9)' }],
  },
  {
    name: '--globe-border-strong',
    description: 'Borders of the pin popup and the control buttons.',
    usages: [
      { element: 'Pin popup', property: 'border-color', fallback: 'rgb(0 0 0 / 0.12)' },
      { element: 'Controls', property: 'border-color', fallback: 'rgb(255 255 255 / 0.3)' },
    ],
  },
  {
    name: '--globe-text-primary',
    description: 'Pin popup title.',
    usages: [{ element: 'Pin popup', property: 'color', fallback: 'rgb(17 37 58)' }],
  },
  {
    name: '--globe-text-secondary',
    description: 'Pin popup subtitle.',
    usages: [{ element: 'Pin popup', property: 'color', fallback: 'rgb(60 90 114)' }],
  },
  {
    name: '--globe-r-sm',
    description: 'Small corner radius: the country tooltip.',
    usages: [{ element: 'Country tooltip', property: 'border-radius', fallback: '0.375rem' }],
  },
  {
    name: '--globe-r-md',
    description: 'Medium corner radius: the pin popup.',
    usages: [{ element: 'Pin popup', property: 'border-radius', fallback: '0.625rem' }],
  },
  {
    name: '--globe-shadow-md',
    description: 'Medium drop shadow: the cluster marker and the country tooltip.',
    usages: [
      { element: 'Cluster marker', property: 'box-shadow', fallback: '0 4px 12px rgb(0 0 0 / 0.28)' },
      { element: 'Country tooltip', property: 'box-shadow', fallback: '0 4px 12px rgb(0 0 0 / 0.28)' },
    ],
  },
  {
    name: '--globe-shadow-lg',
    description: 'Large drop shadow: the pin popup.',
    usages: [{ element: 'Pin popup', property: 'box-shadow', fallback: '0 12px 32px rgb(0 0 0 / 0.3)' }],
  },
] as const satisfies readonly GlobeThemeToken[]);
