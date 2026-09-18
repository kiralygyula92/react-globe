---
description: Add keyboard-reachable zoom, rotate and reset buttons, or replace them with your own.
symbols:
  - Globe
  - GlobeControlsRenderProps
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/components/DefaultControls.tsx
---

## Basics

Set `showControls` for zoom in, zoom out, rotate left, rotate right and reset buttons.

::demo{src="./demo-basics.tsx" title="Built-in controls"}

### Buttons

The buttons sit in the bottom-right corner. Zoom steps by a fifth of the current distance, rotation by
24° of longitude, and reset returns to [home](/react-globe/camera/).

### States

Zoom in and zoom out disable at `minZoom` and `maxZoom`; reset disables while the camera is already at
home.

### Accessibility

The controls are real `<button>` elements with focus-visible outlines and accessible names that follow
the [`locale`](/react-globe/localization/).

## Customization

`controlsComponent` replaces the buttons entirely. It receives the actions, their enabled states, the
current camera and the localized strings; position it yourself inside the globe's container.

::demo{src="./demo-customization.tsx" title="A toolbar across the top"}

Interactive elements must set `pointer-events: auto`: the overlay they render into passes pointer
events through to the globe. See [Overriding components](/react-globe/customization/overriding-components/).

## Limitations

- **Corner is fixed.** The built-in controls cannot be moved; use `controlsComponent` for another
  position.
- **`controlsComponent` needs `showControls`.** The replacement renders only while `showControls` is
  true.
