/**
 * Holds GLOBE_THEME_TOKENS equal to what the components actually read, and every
 * `@default` in the public types equal to GLOBE_DEFAULTS, so both can be documented
 * by generation instead of by hand.
 */

import { describe, expect, it } from 'vitest';
import typesSource from './types.ts?raw';
import capitalMarker from './components/CapitalMarker.tsx?raw';
import countryLabel from './components/CountryLabel.tsx?raw';
import countryTooltip from './components/CountryTooltip.tsx?raw';
import defaultCluster from './components/DefaultCluster.tsx?raw';
import defaultControls from './components/DefaultControls.tsx?raw';
import defaultPinPopup from './components/DefaultPinPopup.tsx?raw';
import graticuleLabel from './components/GraticuleLabel.tsx?raw';
import { GLOBE_DEFAULTS } from './defaults';
import { GLOBE_THEME_TOKENS, type GlobeThemeTokenUsage } from './tokens';

const SOURCES: Record<GlobeThemeTokenUsage['element'], string> = {
  'Capital marker': capitalMarker,
  'Country label': countryLabel,
  'Country tooltip': countryTooltip,
  'Cluster marker': defaultCluster,
  Controls: defaultControls,
  'Pin popup': defaultPinPopup,
  'Graticule label': graticuleLabel,
};

/** Tailwind arbitrary values write spaces as `_` and drop them around `/`. */
const normalise = (fallback: string): string =>
  fallback
    .replace(/_/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();

/** Every `var(--globe-name, fallback)` in a source, allowing one level of nested parentheses. */
function tokenUses(source: string): { name: string; fallback: string }[] {
  return [...source.matchAll(/var\((--globe-[a-z0-9-]+)\s*,\s*((?:[^()]|\([^()]*\))+)\)/g)].map((m) => ({
    name: m[1],
    fallback: normalise(m[2]),
  }));
}

describe('GLOBE_THEME_TOKENS', () => {
  const key = (element: string, name: string, fallback: string) => `${element} · ${name} · ${fallback}`;

  const inSource = new Set(
    Object.entries(SOURCES).flatMap(([element, source]) => tokenUses(source).map((u) => key(element, u.name, u.fallback))),
  );
  const inManifest = new Set(
    GLOBE_THEME_TOKENS.flatMap((t) => t.usages.map((u) => key(u.element, t.name, normalise(u.fallback)))),
  );

  it('lists every token use the components contain', () => {
    expect([...inSource].filter((k) => !inManifest.has(k))).toEqual([]);
  });

  it('lists no token use the components do not contain', () => {
    expect([...inManifest].filter((k) => !inSource.has(k))).toEqual([]);
  });

  it('names each token once, with a description', () => {
    const names = GLOBE_THEME_TOKENS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const token of GLOBE_THEME_TOKENS) expect(token.description.length).toBeGreaterThan(0);
  });
});

describe('@default tags in GlobeProps', () => {
  const props = typesSource.slice(typesSource.indexOf('export interface GlobeProps'), typesSource.indexOf('export interface GlobeHandle'));
  const tagged = new Map(
    [...props.matchAll(/@default (.+)\n\s*\*\/\n\s*(\w+)\?:/g)].map((m) => [m[2], m[1].trim()]),
  );

  it('match GLOBE_DEFAULTS exactly, for every defaulted prop', () => {
    const literal = (value: unknown) => (typeof value === 'string' ? `'${value}'` : String(value));
    expect(Object.fromEntries(tagged)).toEqual(
      Object.fromEntries(Object.entries(GLOBE_DEFAULTS).map(([k, v]) => [k, literal(v)])),
    );
  });
});
