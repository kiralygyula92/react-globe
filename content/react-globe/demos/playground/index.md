---
pluginId: react-globe
title: Playground
description: One globe with a live control for every prop, every render override and the imperative handle.
date: 2026-09-15
---

Change any prop in the panel and the globe updates immediately. Use it to explore combinations before
writing code, or to check how a prop behaves.

::demo{src="./demo-playground.tsx" title="Globe playground" height="760"}

## What you can try

- **Camera and interaction** — gestures, distance limits and the built-in controls; see
  [Gestures](/react-globe/gestures/) and [Camera](/react-globe/camera/).
- **Geography** — borders, names, capitals, hover and the graticule; see
  [Country names](/react-globe/country-names/) and [Country hover & click](/react-globe/country-interaction/).
- **Appearance and localization** — all four [render styles](/react-globe/render-styles/), grayscale,
  background tokens and the six built-in [locales](/react-globe/localization/).
- **Pins and connections** — eleven cities, a 5,000-pin stress set, [clustering](/react-globe/pin-clustering/),
  popups and [connections](/react-globe/connections/), including one that points at a missing pin on purpose.
- **Render overrides** — replace the pin marker, popup, cluster marker, connections and controls; see
  [Overriding components](/react-globe/customization/overriding-components/).
- **Imperative handle** — flights, zoom, auto-rotation, reset and a controlled camera; see the
  [Camera API](/react-globe/camera-api/).
- **Lifecycle** — unmount and remount the globe to see that it cleans up after itself.

The Events list shows `onReady`, `onError`, pin clicks and country clicks as they happen.
