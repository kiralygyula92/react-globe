---
pluginId: react-globe
capabilityId: gestures
title: Gestures
description: Orbit, tilt and zoom the globe with mouse, wheel and touch, each gesture switchable and bounded.
group: Interaction
plan: free
symbols:
  - Globe
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/controls/PointerControls.ts
---

## Basics

Every gesture is on by default: drag to orbit, right-drag to tilt, and scroll or pinch to zoom.

::demo{src="./demo-basics.tsx" title="Try every gesture"}

### Orbit

Drag with the primary mouse button or one finger. The globe keeps turning briefly after release and
slows to a stop. `enableRotation={false}` turns it off.

### Tilt

Drag with the secondary mouse button, or hold Shift and drag. Tilt pivots on the point you grabbed and
stays between 0° and 75°. While tilt is enabled, the canvas suppresses its own context menu so the
right button can tilt; the rest of the page keeps its menu. `enableTilt={false}` turns it off.

### Zoom

Scroll the wheel or pinch with two fingers. `minZoom` and `maxZoom` bound the distance. With
`enableZoom={false}` no wheel listener is attached at all, so scrolling over the globe scrolls the
page.

### Interrupting flights

Any drag, wheel or pinch cancels a camera flight that is in progress, so the reader is never fighting
an animation.

## Customization

Switch gestures independently and narrow the zoom range to fit your layout.

::demo{src="./demo-customization.tsx" title="Toggle gestures with a narrow zoom range"}

To add buttons for the same actions, see [Controls](/react-globe/controls/); for everything else, see
[How to customize](/react-globe/customization/).

## Limitations

- **Touch scrolling stops at the globe.** The canvas sets `touch-action: none`, so on a touch screen a
  swipe that starts on the globe never scrolls the page. Leave space around a full-width globe, or turn
  gestures off where the page must scroll.
- **No tilt on touch screens.** Tilt needs a secondary button or Shift; there is no two-finger tilt
  gesture.
- **No keyboard gestures.** The canvas is not keyboard-operable. Add [Controls](/react-globe/controls/)
  for keyboard users.
- **Auto-rotate continues through a drag.** See [Auto-rotate](/react-globe/auto-rotate/) for stopping it
  on interaction.
