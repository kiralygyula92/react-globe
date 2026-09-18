---
description: How React Globe keeps rendering and loading costs down, and what you can do to help.
date: 2026-09-15
---

## Rendering

- **One animation loop per globe**, stopped entirely while the canvas is out of the viewport or the tab
  is hidden.
- **Draws only on change.** A frame is rendered when the camera, data or an animation changed. A globe
  nobody is interacting with, with no auto-rotation, skips drawing.
- **Throttled background work.** Cloud drift steps ten times a second; the sets of visible labels, pins
  and clusters are recomputed twenty times a second while the camera moves.
- **No per-frame React updates.** Overlay positions are written to the DOM directly, not through React
  state.
- **One draw call for pins.** The default marker is a single instanced mesh however many pins there are.
  A `pinComponent` renders one DOM element per visible pin instead.
- **Screen-space clustering** runs in time proportional to the number of pins.

## Loading

- **On demand.** A dataset or texture is fetched only when a visible feature needs it: borders when
  `showCountryBorders` is on, capitals when `showCapitals` is on, satellite textures only for the
  `realistic` style.
- **Progressive imagery.** The `realistic` style shows a smaller day texture while the full-resolution
  one loads.
- **Off the main thread.** Images are decoded with `createImageBitmap` where the browser supports it.
- **Shared.** Decoded images and parsed datasets are cached per URL while any globe is on the page, so a
  second globe or a remount does not load them again. A minute after the last globe unmounts they are
  released — the decoded day map alone is well over 100 MB — and a later globe loads them afresh, mostly
  from the browser's HTTP cache. The flat styles' land mesh is built once, during idle time, and shared.

## Cleanup

Unmounting a globe disposes its geometries, materials and textures, removes its listeners, cancels its
animation loop and releases its WebGL context. The package's end-to-end suite mounts and unmounts a
globe twenty times and checks that no context is leaked.

## What you can do

- Keep `pins` and `connections` arrays stable between renders.
- Prefer the built-in pin marker and connections for large data sets; overrides render DOM.
- Turn off layers you do not need: they are then never downloaded.
- Keep three.js out of your main bundle with a dynamic import; see [Lazy loading](/react-globe/lazy-loading/).
- Mount only the globes that are on screen.

## Measurements

Frame rates depend heavily on the device and browser, and no benchmark numbers are published yet.
Measure with your own data on your target devices using the browser's performance tools.
