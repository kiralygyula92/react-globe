---
description: React Globe is a React component that draws an interactive 3D Earth with plain three.js. It adds pins, clustering, great-circle connections and country layers, and lets you replace every visual element with your own component.
---

## Introduction

React Globe is a single React component, `Globe`, that renders an interactive 3D Earth in a WebGL
canvas. Everything it does is configured through props: the camera, four render styles, geographic
layers such as borders, country names and capitals, and the data you place on it — pins, clusters,
popups and connections between places.

It is built on plain three.js, with no other runtime dependency beyond React. The Earth imagery and the
geographic datasets ship with the package and are served from your own site, so nothing is fetched from
a third-party host while the globe runs. Every bundled file is in the public domain.

The package covers the globe itself. It does not provide map tiles, geocoding, routing or a data
backend: you bring the coordinates, and the globe draws and animates them.

## Why React Globe

- **One component:** `<Globe />` renders a working Earth with no props; every layer, gesture and
  override is one more prop on the same component.
- **Four looks from one prop:** switch between a physical map, satellite imagery, a printed atlas and a
  neon rendering, in colour or grayscale, without restyling anything else.
- **Your components, not ours:** pins, popups, clusters, connections and controls can each be replaced
  with your own React component, and the built-in ones follow your CSS custom properties.
- **Readable at scale:** pins cluster in screen space, and the default pin marker is a single instanced
  WebGL mesh.
- **Considerate by default:** the built-in controls are real buttons, the hovered country is announced
  to screen readers, animations stop for readers who prefer reduced motion, and a globe nobody is
  interacting with does not redraw.
- **Localized:** built-in strings and bundled place names in English, Romanian, German, Spanish, French
  and Hungarian, with a path to add more.

## Start now

- [Installation](/react-globe/getting-started/installation/) — add the package and its stylesheet to
  your project.
- [Usage](/react-globe/getting-started/usage/) — render your first globe with pins in a few lines.
- [All features](/react-globe/all-features/) — every capability, grouped, with a live demo on each page.
- [Pins](/react-globe/pins/) — place your own data on the globe.
- [How to customize](/react-globe/customization/) — theme or replace any visual element.
- [Playground](/react-globe/demos/playground/) — one globe with many features working together.
