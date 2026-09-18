---
description: Spin the globe continuously at a chosen speed, paused automatically for readers who prefer reduced motion.
symbols:
  - GlobeHandle
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/GlobeEngine.ts
---

## Basics

Call `startAutoRotate()` on the handle, for example from `onReady`.

::demo{src="./demo-basics.tsx" title="A slowly turning globe"}

### Speed

`startAutoRotate(speed)` takes a multiplier: `1` (the default) turns about 7 degrees per second, `2`
twice that. A negative speed turns the other way. `stopAutoRotate()` stops it.

### Reduced motion

Rotation does not run while the reader's system asks for reduced motion.

### Flights

Rotation pauses while a camera flight is running and resumes when it ends.

## Customization

Stop rotating when the reader shows interest, and resume when they leave.

::demo{src="./demo-customization.tsx" title="Pause on hover, with a speed control"}

See the [Camera API](/react-globe/camera-api/) for the rest of the handle, and
[How to customize](/react-globe/customization/) for the look of the spinning globe.

## Limitations

- **Drags do not stop rotation.** The globe keeps spinning after a drag. Call `stopAutoRotate()` from
  your own pointer or focus handlers, as the demo does.
- **No prop.** Auto-rotation is controlled only through the handle.
