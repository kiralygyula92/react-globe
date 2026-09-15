---
pluginId: react-globe
capabilityId: graticule
title: Graticule
description: Draw meridians and parallels every 15 degrees, with optional degree labels.
group: Display & layout
plan: free
symbols:
  - Globe
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/layers/GraticuleLayer.ts
---

## Basics

Set `showGraticule` for the grid and `showGraticuleLabels` for its degree labels.

::demo{src="./demo-basics.tsx" title="Graticule with labels"}

### Lines

Meridians and parallels are drawn every 15 degrees on the sphere; the equator and the prime meridian
are emphasised.

### Labels

`showGraticuleLabels` adds degree labels along the equator and the prime meridian, and needs
`showGraticule`. The hemisphere letters follow the [`locale`](/react-globe/localization/).

## Customization

Labels take the `--globe-color-label` token; line colour comes with the render style.

::demo{src="./demo-customization.tsx" title="A modern-style graticule with German labels"}

See [Theming](/react-globe/customization/theming/).

## Limitations

- **Fixed 15° spacing.** The interval cannot be changed.
- **Labels on two lines only.** Degree labels sit along the equator and the prime meridian, not at every
  intersection.
