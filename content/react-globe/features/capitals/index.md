---
pluginId: react-globe
capabilityId: capitals
title: Capitals
description: Mark national capitals with a dot and a name that appear as the camera comes closer.
group: Display & layout
plan: free
symbols:
  - Globe
  - CapitalRecord
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/components/CapitalMarker.tsx
---

## Basics

Set `showCapitals` to mark every country's capital with a dot and its name.

::demo{src="./demo-basics.tsx" title="Capitals over Europe"}

### Distance threshold

Capitals render only while the camera is at or closer than `capitalsMinZoom` (default `2.5`). Beyond
that they are removed, not faded, so a whole-planet view stays uncluttered.

### Collisions

Capital names avoid each other and country names. Country names take precedence, and capitals of larger countries win space before smaller ones.

### Language

Names follow the [`locale`](/react-globe/localization/).

## Customization

The dot is `--globe-color-accent`, its ring `--globe-color-outline` and the name
`--globe-color-label`. Raise `capitalsMinZoom` to show capitals from farther away.

::demo{src="./demo-customization.tsx" title="Themed capitals in French, visible from farther away"}

To show your own points with the same marker, pass a `capitalsDataset`; see
[Custom assets](/react-globe/custom-assets/) and [Theming](/react-globe/customization/theming/).

## Limitations

- **No interaction.** Capital markers do not respond to hover or click. Use [pins](/react-globe/pins/)
  for points people should interact with.
- **One marker style.** The marker's shape cannot be replaced by a component.
