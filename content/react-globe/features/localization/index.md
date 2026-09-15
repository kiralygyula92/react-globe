---
pluginId: react-globe
capabilityId: localization
title: Localization
description: Translate the built-in UI strings and the bundled country and capital names into six languages, or add your own.
group: Display & layout
plan: free
symbols:
  - Globe
  - GLOBE_LOCALES
  - DEFAULT_GLOBE_MESSAGES
  - localizedName
  - GlobeLocale
  - GlobeMessages
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/i18n.ts
---

## Basics

Set `locale` to one of `en`, `ro`, `de`, `es`, `fr` or `hu`.

::demo{src="./demo-basics.tsx" title="Switch locale"}

### What is translated

- the accessible names of the zoom, rotate and reset buttons;
- the accessible name of cluster markers, using each language's plural rules;
- the hemisphere letters on graticule labels, such as `30°É` in Hungarian;
- country and capital names in labels, the hover tooltip and the screen-reader announcement.

The container also gets a matching `lang` attribute.

### Regional tags

Any BCP 47 tag works: `de-AT` uses its language subtag, `de`.

### Overriding strings

`messages` replaces any built-in string for the current locale.

```tsx
<Globe locale="de" messages={{ resetView: 'Zurück zur Startansicht' }} />
```

### Names in your own code

`localizedName(place, locale)` returns the name the globe shows, for your own hover and click handlers.

```tsx
<Globe locale="es" onCountryClick={(country) => setTitle(localizedName(country.properties, 'es'))} />
```

## Add a language

For a language that is not built in, pass its tag and every string in `messages`. Start from
`DEFAULT_GLOBE_MESSAGES.en` and replace each value; place names then come from any dataset that
carries that language.

```tsx
const messages: GlobeMessages = { ...DEFAULT_GLOBE_MESSAGES.en, zoomIn: 'Ingrandisci', zoomOut: 'Riduci' /* …every string */ };

<Globe locale="it" messages={messages} />;
```

## Customization

A complete set of strings for a new language, shown on the controls and graticule labels. Custom
controls and cluster markers receive the resolved `messages` as a prop, so replacements stay
translated.

::demo{src="./demo-customization.tsx" title="Italian UI strings"}

See [Overriding components](/react-globe/customization/overriding-components/) and the
[Localization guide](/react-globe/guides/localization/).

## Limitations

- **Six languages of place names.** The bundled datasets carry English, Romanian, German, Spanish,
  French and Hungarian names; other languages fall back to English unless you supply a dataset with
  `names` (a raw Natural Earth countries file includes many languages).
- **Missing strings fall back to English.** A language without built-in strings and without a complete
  `messages` object shows English UI text and logs a development warning.
- **No right-to-left layout.** The built-in controls and popups are laid out left to right.
