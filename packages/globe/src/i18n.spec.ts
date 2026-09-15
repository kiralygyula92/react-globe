/** Locale resolution, message completeness, plurals, and the bundled place names. */

import { describe, expect, it } from 'vitest';
import countriesRaw from './assets/countries-50m.geojson?raw';
import capitalsRaw from './assets/capitals-50m.json?raw';
import { graticuleLabels } from './core/layers/GraticuleLayer';
import { GLOBE_LOCALES, DEFAULT_GLOBE_MESSAGES, languageOf, localizedName, resolveLocale, type GlobeMessages } from './i18n';
import type { CapitalRecord, CountryCollection } from './types';

const STRING_KEYS = ['zoomIn', 'zoomOut', 'rotateLeft', 'rotateRight', 'resetView', 'north', 'south', 'east', 'west'] as const;

describe('languageOf', () => {
  it('takes the primary subtag, lowercased, from any separator', () => {
    expect(languageOf('de')).toBe('de');
    expect(languageOf('de-AT')).toBe('de');
    expect(languageOf('RO_ro')).toBe('ro');
    expect(languageOf(' hu ')).toBe('hu');
  });

  it('falls back to English for nothing at all', () => {
    expect(languageOf(undefined)).toBe('en');
    expect(languageOf('')).toBe('en');
  });
});

describe('DEFAULT_GLOBE_MESSAGES', () => {
  it('ships exactly the six built-in locales', () => {
    expect(Object.keys(DEFAULT_GLOBE_MESSAGES).sort()).toEqual([...GLOBE_LOCALES].sort());
    expect([...GLOBE_LOCALES]).toEqual(['en', 'ro', 'de', 'es', 'fr', 'hu']);
  });

  it.each(GLOBE_LOCALES)('%s has every string, non-empty', (locale) => {
    const messages = DEFAULT_GLOBE_MESSAGES[locale];
    for (const key of STRING_KEYS) expect(messages[key].trim(), key).not.toBe('');
    expect(typeof messages.cluster).toBe('function');
    expect(messages.cluster(3)).toContain('3');
  });

  it.each(GLOBE_LOCALES.filter((l) => l !== 'en'))('%s translates every control label', (locale) => {
    for (const key of ['zoomIn', 'zoomOut', 'rotateLeft', 'rotateRight', 'resetView'] as const) {
      expect(DEFAULT_GLOBE_MESSAGES[locale][key], key).not.toBe(DEFAULT_GLOBE_MESSAGES.en[key]);
    }
  });

  it('pluralises clusters by each language’s rules', () => {
    expect(DEFAULT_GLOBE_MESSAGES.en.cluster(1)).toBe('1 pin');
    expect(DEFAULT_GLOBE_MESSAGES.en.cluster(2)).toBe('2 pins');
    expect(DEFAULT_GLOBE_MESSAGES.ro.cluster(1)).toBe('1 marcaj');
    expect(DEFAULT_GLOBE_MESSAGES.ro.cluster(2)).toBe('2 marcaje');
    expect(DEFAULT_GLOBE_MESSAGES.ro.cluster(20)).toBe('20 de marcaje');
    expect(DEFAULT_GLOBE_MESSAGES.ro.cluster(101)).toBe('101 marcaje');
    expect(DEFAULT_GLOBE_MESSAGES.de.cluster(1)).toBe('1 Markierung');
    expect(DEFAULT_GLOBE_MESSAGES.de.cluster(5)).toBe('5 Markierungen');
    expect(DEFAULT_GLOBE_MESSAGES.es.cluster(5)).toBe('5 marcadores');
    expect(DEFAULT_GLOBE_MESSAGES.fr.cluster(1)).toBe('1 repère');
    expect(DEFAULT_GLOBE_MESSAGES.fr.cluster(5)).toBe('5 repères');
    expect(DEFAULT_GLOBE_MESSAGES.hu.cluster(5)).toBe('5 jelölő');
  });

  it('is frozen, so a consumer cannot edit the shared defaults', () => {
    expect(Object.isFrozen(DEFAULT_GLOBE_MESSAGES)).toBe(true);
  });
});

describe('resolveLocale', () => {
  it('resolves a built-in locale, including a regional tag', () => {
    const resolved = resolveLocale('de-AT');
    expect(resolved.language).toBe('de');
    expect(resolved.messagesLocale).toBe('de');
    expect(resolved.messages.zoomIn).toBe('Vergrößern');
    expect(resolved.fellBack).toBe(false);
  });

  it('defaults to English', () => {
    expect(resolveLocale(undefined).messages).toEqual(DEFAULT_GLOBE_MESSAGES.en);
  });

  it('lays overrides over the locale, ignoring undefined members', () => {
    const resolved = resolveLocale('fr', { zoomIn: 'Plus', zoomOut: undefined });
    expect(resolved.messages.zoomIn).toBe('Plus');
    expect(resolved.messages.zoomOut).toBe('Zoom arrière');
  });

  it('keeps a language with no built-in strings for place names, and reports the English fallback', () => {
    const resolved = resolveLocale('it');
    expect(resolved.language).toBe('it');
    expect(resolved.messagesLocale).toBe('en');
    expect(resolved.messages.zoomIn).toBe('Zoom in');
    expect(resolved.fellBack).toBe(true);
  });

  it('does not report a fallback when overrides cover every string', () => {
    const italian: GlobeMessages = {
      zoomIn: 'Ingrandisci',
      zoomOut: 'Riduci',
      rotateLeft: 'Ruota a sinistra',
      rotateRight: 'Ruota a destra',
      resetView: 'Ripristina vista',
      cluster: (n) => `${n} indicatori`,
      north: 'N',
      south: 'S',
      east: 'E',
      west: 'O',
    };
    const resolved = resolveLocale('it', italian);
    expect(resolved.fellBack).toBe(false);
    expect(resolved.messages.cluster(4)).toBe('4 indicatori');
  });

  it('never mutates the built-in messages', () => {
    resolveLocale('en', { zoomIn: 'Changed' });
    expect(DEFAULT_GLOBE_MESSAGES.en.zoomIn).toBe('Zoom in');
  });
});

describe('localizedName', () => {
  const place = { name: 'Hungary', names: { hu: 'Magyarország', de: 'Ungarn' } };

  it('picks the language, from a full tag too', () => {
    expect(localizedName(place, 'hu')).toBe('Magyarország');
    expect(localizedName(place, 'de-CH')).toBe('Ungarn');
  });

  it('falls back to the English name', () => {
    expect(localizedName(place, 'en')).toBe('Hungary');
    expect(localizedName(place, 'fr')).toBe('Hungary');
    expect(localizedName({ name: 'Nowhere' }, 'ro')).toBe('Nowhere');
  });
});

describe('graticule labels', () => {
  it('use the hemisphere letters they are given', () => {
    const hu = graticuleLabels({ north: 'É', south: 'D', east: 'K', west: 'Ny' }).map((l) => l.text);
    expect(hu).toContain('30°É');
    expect(hu).toContain('45°D');
    expect(hu).toContain('90°K');
    expect(hu).toContain('120°Ny');
    expect(graticuleLabels().map((l) => l.text)).toContain('30°N');
  });
});

describe('bundled place names', () => {
  const countries = (JSON.parse(countriesRaw) as CountryCollection).features.map((f) => f.properties);
  const capitals = JSON.parse(capitalsRaw) as CapitalRecord[];
  const translated = GLOBE_LOCALES.filter((l) => l !== 'en');

  it('only carry built-in languages, as non-empty strings that differ from English', () => {
    for (const place of [...countries, ...capitals]) {
      for (const [lang, value] of Object.entries(place.names ?? {})) {
        expect(translated as readonly string[]).toContain(lang);
        expect(value.trim()).not.toBe('');
        expect(value).not.toBe(place.name);
      }
    }
  });

  it('name well-known countries in every built-in language', () => {
    const byId = new Map(countries.map((c) => [c.id, c]));
    expect(byId.get('DEU')?.names).toEqual({
      ro: 'Germania',
      de: 'Deutschland',
      es: 'Alemania',
      fr: 'Allemagne',
      hu: 'Németország',
    });
    expect(localizedName(byId.get('ROU')!, 'ro')).toBe('România');
    expect(localizedName(byId.get('HUN')!, 'hu')).toBe('Magyarország');
  });

  it('name capitals too', () => {
    const vienna = capitals.find((c) => c.name === 'Vienna')!;
    expect(localizedName(vienna, 'de')).toBe('Wien');
    expect(localizedName(vienna, 'hu')).toBe('Bécs');
    expect(localizedName(vienna, 'ro')).toBe('Viena');
  });
});
