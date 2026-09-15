---
pluginId: react-globe
title: Best practices
description: Habits that keep a globe smooth, predictable and accessible in a real application.
date: 2026-09-15
---

## Give the container a size

The globe fills its container. Set a height on the container, or pass `height`, before anything else.

## Keep data arrays stable

Pass the same `pins` and `connections` array until the data really changes. A new array identity resets
hover and selection and re-projects every pin.

```tsx
const pins = useMemo(() => rows.map(toPin), [rows]);
```

## Keep override components outside render

Define `pinComponent`, `pinPopupComponent`, `clusterComponent`, `connectionComponent` and
`controlsComponent` at module level. A component created during render is a new type each time.

## Choose uncontrolled camera unless you need control

`defaultCamera` is enough for most screens. Use `camera` only when your UI moves the globe, and change
it only when you mean to move the camera — never pass a new inline object on every render.

## Mount only the globes on screen

Each globe uses a WebGL context and browsers cap how many can be live. Unmount globes that scroll away,
or load them on demand with [lazy loading](/react-globe/lazy-loading/).

## Handle failure

Always pass `onError` in production and show your own message; a device without WebGL will get the
wordless fallback otherwise. See [Error handling](/react-globe/error-handling/).

## Offer controls for keyboard users

The canvas is not keyboard-operable. Turn on `showControls`, or provide your own controls.

## Respect motion preferences in your own code

The globe stops its own animations under `prefers-reduced-motion`; do the same for anything you
animate around it, such as an auto-rotate you start from a timer.
