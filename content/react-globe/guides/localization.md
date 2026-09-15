---
pluginId: react-globe
title: Localization
description: Plan a translated globe, add a language that is not built in, and keep your own components in step.
date: 2026-09-15
---

For the props and a live demo, see the [Localization](/react-globe/localization/) capability page. This
guide covers the decisions around it.

## Follow your application's locale

Pass the locale your application already uses. The globe reads only the language subtag, so tags such as
`de-AT` or `fr-CA` work unchanged.

```tsx
const { locale } = useAppLocale();
<Globe locale={locale} />;
```

## Adding a language

1. Copy `DEFAULT_GLOBE_MESSAGES.en` and translate every value, including `cluster`, which receives the
   count and should apply your language's plural rules — `Intl.PluralRules` does the work.
2. Pass the object as `messages` with the language's tag as `locale`.
3. Supply place names: a dataset whose countries and capitals carry a `names` entry for the language.
   A raw Natural Earth countries file already has `NAME_XX` columns for many languages; for capitals,
   provide `names` in your `capitalsDataset`.

Without a complete `messages` object the globe falls back to English strings and warns in development.

## Your own components

Custom controls and cluster markers receive the resolved `messages`; use them for accessible names.
Text in your own popups, pin markers and panels is yours to translate. Use `localizedName` so the names
you show match the ones on the globe.

## Numbers and coordinates

The globe does not format numbers for you. Format coordinates and counts in your own components with
`Intl.NumberFormat` for the same locale.

## Right-to-left languages

The built-in controls and popups are laid out left to right. For right-to-left interfaces, provide your
own `controlsComponent` and `pinPopupComponent` with the direction your application uses.
