---
pluginId: react-globe
title: Testing
description: How to test screens that contain a globe, from unit tests without WebGL to browser tests with it.
date: 2026-09-15
---

## Unit tests without WebGL

Test runners that simulate the DOM, such as jsdom, have no WebGL. A `Globe` rendered there reports an
error through `onError` and shows its fallback instead of throwing, so the rest of your component tree
can still be tested. Assert on your own behaviour — for example that your error message appears — rather
than on the canvas.

For logic around the globe, test your own functions: the code that turns records into `Pin` objects,
decides the camera pose or builds connections.

## Browser tests with WebGL

Use a real browser. Headless Chromium can render WebGL in software with these flags, which is how the
package tests itself with Playwright:

```ts
// playwright.config.ts
use: {
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
}
```

Software rendering is slow: test correctness, not frame rate, and allow generous timeouts.

## Stable hooks

- `[data-globe-root]` is the globe's container, and `[data-globe-root] canvas` its canvas once running.
- `[data-globe-fallback]` appears when the globe has failed.
- The built-in controls are buttons with accessible names from the current locale, such as
  `getByRole('button', { name: 'Zoom in' })`.

## Driving the camera

Expose the handle from `onReady` in your test build, then set the camera directly instead of simulating
drags:

```ts
await page.evaluate(() => window.testGlobe.setCamera({ lat: 48, lng: 2, zoom: 2 }, { animate: false }));
```

`latLngToScreen` gives you the pixel to click for a known coordinate.

## Waiting

Datasets and textures load asynchronously. Wait for the element you assert on — a label, a cluster
button, your own output — rather than a fixed delay.
