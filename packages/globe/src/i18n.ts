/**
 * Localisation: the built-in UI strings in six languages, locale resolution, and
 * the lookup that picks a place name for the current language.
 *
 * No runtime dependency: messages are plain objects, plurals come from
 * `Intl.PluralRules`. Place names ship inside the bundled datasets as
 * `names: { [language]: string }` and fall back to the English `name`.
 */

/** Locales with built-in UI strings and bundled place names. */
export const GLOBE_LOCALES = ['en', 'ro', 'de', 'es', 'fr', 'hu'] as const;

/** A locale with built-in UI strings: one of `GLOBE_LOCALES`. */
export type GlobeLocale = (typeof GLOBE_LOCALES)[number];

/** Every string the built-in components render or announce. */
export type GlobeMessages = {
  /** Accessible name of the zoom-in control. */
  zoomIn: string;
  /** Accessible name of the zoom-out control. */
  zoomOut: string;
  /** Accessible name of the rotate-left control. */
  rotateLeft: string;
  /** Accessible name of the rotate-right control. */
  rotateRight: string;
  /** Accessible name of the reset-view control. */
  resetView: string;
  /** Accessible name of a cluster marker holding `count` pins. */
  cluster: (count: number) => string;
  /** Suffix for northern latitudes on graticule labels, as in 30°N. */
  north: string;
  /** Suffix for southern latitudes on graticule labels, as in 30°S. */
  south: string;
  /** Suffix for eastern longitudes on graticule labels, as in 90°E. */
  east: string;
  /** Suffix for western longitudes on graticule labels, as in 90°W. */
  west: string;
};

/** `forms[category]` for the language's plural category, else `forms.other`. */
function plural(locale: string, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string {
  const category = new Intl.PluralRules(locale).select(count);
  return (forms[category] ?? forms.other).replace('#', String(count));
}

/**
 * The built-in UI strings for every locale in `GLOBE_LOCALES`. Frozen; spread one into
 * `messages` to start a translation or override a few strings.
 */
export const DEFAULT_GLOBE_MESSAGES: Readonly<Record<GlobeLocale, Readonly<GlobeMessages>>> = Object.freeze({
  en: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    resetView: 'Reset view',
    cluster: (count) => plural('en', count, { one: '# pin', other: '# pins' }),
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'W',
  },
  ro: {
    zoomIn: 'Mărire',
    zoomOut: 'Micșorare',
    rotateLeft: 'Rotire la stânga',
    rotateRight: 'Rotire la dreapta',
    resetView: 'Resetare vizualizare',
    // Romanian inserts "de" from 20 upward: 2 marcaje, 20 de marcaje.
    cluster: (count) => plural('ro', count, { one: '# marcaj', few: '# marcaje', other: '# de marcaje' }),
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'V',
  },
  de: {
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    rotateLeft: 'Nach links drehen',
    rotateRight: 'Nach rechts drehen',
    resetView: 'Ansicht zurücksetzen',
    cluster: (count) => plural('de', count, { one: '# Markierung', other: '# Markierungen' }),
    north: 'N',
    south: 'S',
    east: 'O',
    west: 'W',
  },
  es: {
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    rotateLeft: 'Girar a la izquierda',
    rotateRight: 'Girar a la derecha',
    resetView: 'Restablecer vista',
    cluster: (count) => plural('es', count, { one: '# marcador', other: '# marcadores' }),
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'O',
  },
  fr: {
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    rotateLeft: 'Tourner vers la gauche',
    rotateRight: 'Tourner vers la droite',
    resetView: 'Réinitialiser la vue',
    cluster: (count) => plural('fr', count, { one: '# repère', other: '# repères' }),
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'O',
  },
  hu: {
    zoomIn: 'Nagyítás',
    zoomOut: 'Kicsinyítés',
    rotateLeft: 'Forgatás balra',
    rotateRight: 'Forgatás jobbra',
    resetView: 'Nézet visszaállítása',
    // Hungarian keeps the noun singular after a number.
    cluster: (count) => `${count} jelölő`,
    north: 'É',
    south: 'D',
    east: 'K',
    west: 'Ny',
  },
});

/** The primary language subtag, lowercased: 'de-AT' and 'de_at' both give 'de'. */
export function languageOf(locale: string | undefined): string {
  return (locale ?? '').trim().toLowerCase().split(/[-_]/)[0] || 'en';
}

export const isGlobeLocale = (language: string): language is GlobeLocale =>
  (GLOBE_LOCALES as readonly string[]).includes(language);

export type ResolvedLocale = {
  /** Language used for place names and the container's `lang`; may be one with no built-in messages. */
  language: string;
  /** Built-in message set the UI strings start from. */
  messagesLocale: GlobeLocale;
  messages: GlobeMessages;
  /** True when the language has no built-in messages and `overrides` did not cover every string. */
  fellBack: boolean;
};

const MESSAGE_KEYS = Object.keys(DEFAULT_GLOBE_MESSAGES.en) as (keyof GlobeMessages)[];

/** The locale's built-in messages, with every defined override on top. */
export function resolveLocale(locale: string | undefined, overrides?: Partial<GlobeMessages>): ResolvedLocale {
  const language = languageOf(locale);
  const builtIn = isGlobeLocale(language);
  const messagesLocale: GlobeLocale = builtIn ? language : 'en';
  const messages = { ...DEFAULT_GLOBE_MESSAGES[messagesLocale] } as GlobeMessages;
  for (const key of MESSAGE_KEYS) {
    const value = overrides?.[key];
    if (value !== undefined) (messages as Record<string, unknown>)[key] = value;
  }
  const fellBack = !builtIn && MESSAGE_KEYS.some((key) => overrides?.[key] === undefined);
  return { language, messagesLocale, messages, fellBack };
}

/**
 * A place's name in `language`, falling back to its English `name` — the name the globe
 * itself shows for that locale.
 * @param place A country's properties or a capital record.
 * @param language A BCP 47 tag; only its language subtag is used.
 */
export function localizedName(
  place: { name: string; names?: Readonly<Record<string, string>> | null },
  language: string,
): string {
  return place.names?.[languageOf(language)] ?? place.name;
}
