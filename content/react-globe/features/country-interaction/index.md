---
pluginId: react-globe
capabilityId: country-interaction
title: Country hover & click
description: Highlight and name the country under the pointer, and respond to hovers and clicks on countries.
group: Interaction
plan: free
symbols:
  - Globe
  - CountryFeature
  - CountryProperties
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/layers/HighlightLayer.ts
---

## Basics

Turn on `highlightCountryOnHover` and `showCountryNameOnHover`, and handle clicks with `onCountryClick`.

::demo{src="./demo-basics.tsx" title="Hover highlight, tooltip and click"}

### Highlight

`highlightCountryOnHover` fills the hovered country's polygon. The fill defaults to a colour chosen for
each render style.

### Tooltip

`showCountryNameOnHover` shows the country's name next to the cursor. It is ignored, with a
development warning, while `showCountryNames` is on.

### Events

`onCountryHover` fires with the country under the pointer, or `null` when the pointer leaves every
country. `onCountryClick` fires for a press that moved no more than 4 pixels, so a drag never counts as
a click. Both receive the GeoJSON feature, with its `id`, `name`, ISO codes and localized `names`.

### Screen readers

The hovered country's name is announced through a visually hidden live region.

## Customization

Set the fill per style with `countryHighlightColor`, theme the tooltip, and show your own details from
`onCountryHover`.

::demo{src="./demo-customization.tsx" title="A purple highlight, themed tooltip and Spanish names"}

See [Theming](/react-globe/customization/theming/) for the tooltip tokens.

## Limitations

- **Hit-testing uses the country dataset.** Hover and click find countries geometrically in
  `countriesGeoJson`, so they match the polygons in your dataset, not the imagery.
- **Pins take precedence.** A press on a pin fires `onPinClick`, not `onCountryClick`.
