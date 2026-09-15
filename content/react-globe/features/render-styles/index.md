---
pluginId: react-globe
capabilityId: render-styles
title: Render styles
description: Draw the Earth as a physical map, satellite imagery, a printed atlas or a neon globe, in colour or grayscale.
group: Core features
plan: free
symbols:
  - Globe
  - RenderStyle
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/materials
---

A render style sets the globe's whole look in one prop, so it can match a product screen, a report or
a dark dashboard without restyling individual layers.

## Basics

Set `renderStyle` to `standard`, `realistic`, `cartoon` or `modern`.

::demo{src="./demo-basics.tsx" title="Switch between the four styles"}

### Style

- `standard` (default) — a cel-shaded physical map: land cover and relief under country borders.
- `realistic` — satellite imagery with a normal and specular map, an atmosphere and a cloud layer.
- `cartoon` — a printed-atlas look with flat, distinct country colours.
- `modern` — a dark, neon rendering suited to dashboards.

### Colour scheme

`colorScheme="grayscale"` desaturates the globe in its shaders. Pins, labels, popups and connections
keep their colours, so data still stands out.

```tsx
<Globe colorScheme="grayscale" pins={pins} />
```

### Clouds

`showClouds` (default `true`) toggles the drifting cloud layer. Only `realistic` has one; the prop has
no effect on other styles. Cloud drift stops under `prefers-reduced-motion`.

## Customization

Combine a style with the colour scheme, a background and a per-style hover colour.

::demo{src="./demo-customization.tsx" title="Grayscale cartoon with a warm hover fill"}

`countryHighlightColor` accepts one colour for every style or an object keyed by style. See
[How to customize](/react-globe/customization/) for theming the elements drawn over the globe.

## Limitations

- **Palettes are fixed per style.** Land, sea and border colours inside a style cannot be changed;
  choose the closest style and combine it with `colorScheme` and `backgroundColor`.
- **Clouds only in `realistic`.**
- **The shaded styles read bundled rasters.** `standard`, `cartoon` and `modern` take land cover and
  relief from bundled files even when `assets.dayTexture` is replaced; see
  [Custom assets](/react-globe/custom-assets/).
