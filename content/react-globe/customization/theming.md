---
pluginId: react-globe
title: Theming
description: Restyle the built-in labels, tooltip, popup, cluster marker and controls with CSS custom properties.
date: 2026-09-15
symbols:
  - GLOBE_THEME_TOKENS
  - GlobeThemeToken
  - GlobeThemeTokenUsage
---

The built-in components read their colours, radii and shadows from CSS custom properties named
`--globe-*`. Each use has a literal fallback, so the globe looks right with none set; define any of
them on an ancestor to override it.

## Setting tokens

Define tokens on the element that contains the globe, or higher up — a theme class on `body` works.

```css
.dashboard {
  --globe-color-label: rgb(226 232 240);
  --globe-color-accent: rgb(244 114 182);
  --globe-color-cluster: rgb(99 102 241);
  --globe-color-cluster-text: white;
  --globe-surface-card: rgb(30 41 59);
  --globe-border-strong: rgb(71 85 105);
  --globe-text-primary: white;
  --globe-text-secondary: rgb(148 163 184);
}
```

In React, set them in a style object:

```tsx
<div style={{ '--globe-color-cluster': 'rgb(99 102 241)' } as React.CSSProperties}>
  <Globe pins={pins} />
</div>
```

## Every token

The complete list — each token, the elements and CSS properties that read it, and every fallback — is
generated from the source into the [`GLOBE_THEME_TOKENS` reference](/react-globe/api/globe-theme-tokens/).
The same list is exported at runtime as `GLOBE_THEME_TOKENS`, so tooling can read it too.

## Light and dark themes

Define the tokens once per theme and let the cascade switch them:

```css
:root { --globe-color-label: rgb(15 23 42); }
@media (prefers-color-scheme: dark) {
  :root { --globe-color-label: rgb(241 245 249); }
}
```

## What tokens do not cover

- The globe's own surface, land, sea and line colours come from the
  [render style](/react-globe/render-styles/).
- The background behind the globe is the [`backgroundColor`](/react-globe/background/) prop, which can
  itself name a token.
- The hover fill is the `countryHighlightColor` prop.
