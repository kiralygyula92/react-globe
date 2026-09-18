---
description: Draw coastlines and land borders from Natural Earth 1:50m data, each on or off.
symbols:
  - Globe
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/layers/VectorLayer.ts
---

## Basics

Shorelines and country borders are on by default; turn either off with its prop.

::demo{src="./demo-basics.tsx" title="Toggle shorelines and borders"}

### Shorelines

`showShorelines` draws the Natural Earth 1:50m coastline.

### Country borders

`showCountryBorders` draws Natural Earth 1:50m land boundaries between countries.

### On demand

A layer that is off is never downloaded, so a globe without borders does not fetch the borders
dataset.

## Customization

Line colour, width and opacity come with the [render style](/react-globe/render-styles/); `cartoon`
draws the heaviest lines and `colorScheme="grayscale"` draws them in grey.

::demo{src="./demo-customization.tsx" title="Cartoon-style borders"}

See [How to customize](/react-globe/customization/) for everything that can be themed.

## Limitations

- **No line styling props.** Colour, width and opacity cannot be set independently of the render
  style.
- **Shorelines are not drawn in `modern`.** That style renders coastlines fully transparent, so
  `showShorelines` has no visible effect there.
- **Bundled data only.** The coastline and border datasets cannot be replaced through `assets`.
- **1:50m detail.** Small islands and short borders are simplified at this scale.
