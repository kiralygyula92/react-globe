---
pluginId: react-globe
capabilityId: country-names
title: Country names
description: Label countries with crisp DOM text that avoids collisions and follows the camera.
group: Display & layout
plan: free
symbols:
  - Globe
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/components/CountryLabel.tsx
---

## Basics

Set `showCountryNames` to label every country on the visible side of the globe.

::demo{src="./demo-basics.tsx" title="Country names"}

### Collisions

Labels are DOM text, positioned over the globe every frame. When two overlap, the more important one
keeps its place: priority comes from the dataset's `labelPriority`, lower first.

### Distance threshold

`countryNamesMinZoom` hides the names until the camera is at or closer than that distance. The
default, `0`, shows them at every distance.

### Language

Names follow the [`locale`](/react-globe/localization/): the bundled dataset carries English,
Romanian, German, Spanish, French and Hungarian names.

## Customization

The label colour is the `--globe-color-label` theme token, set on any ancestor.

::demo{src="./demo-customization.tsx" title="Themed labels shown only up close"}

See [Theming](/react-globe/customization/theming/) for every token.

## Limitations

- **Labels sit at one anchor per country.** A country made of several islands is labelled once, at
  its dataset label point or the centre of its largest polygon.
- **Hover names are separate.** `showCountryNameOnHover` shows a tooltip only while
  `showCountryNames` is off; see [Country hover & click](/react-globe/country-interaction/).
