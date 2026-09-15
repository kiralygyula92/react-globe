---
pluginId: react-globe
capabilityId: camera-api
title: Camera API
description: Fly, zoom, reset and read the camera from your own code through the globe's imperative handle.
group: Interaction
plan: free
symbols:
  - GlobeHandle
  - CameraPose
  - LatLng
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/GlobeEngine.ts
---

## Basics

Attach a `ref` to get a `GlobeHandle` and call its methods from event handlers.

::demo{src="./demo-basics.tsx" title="Fly, zoom and reset from buttons"}

### Getting the handle

Use a `ref`, or take the handle from `onReady`, which fires once the globe is ready. The handle's
identity is stable for the life of the mount.

### Moving the camera

- `flyTo(target, { zoom, durationMs })` centres a coordinate, optionally at a new distance.
- `setCamera(pose, { animate, durationMs })` moves to a full or partial pose; `animate: false` jumps.
- `zoomIn(step)` and `zoomOut(step)` move by a fraction of the current distance (default `0.2`).
- `reset()` returns to [home](/react-globe/camera/).

Animations run for 900 ms unless you pass `durationMs`, and jump straight to the target under
`prefers-reduced-motion`.

### Reading the camera

`getCamera()` returns the current pose. For every change, use `onCameraChange` instead of polling.

## Customization

Combine the handle with pin events to build guided tours and focus effects.

::demo{src="./demo-customization.tsx" title="Tilt towards a clicked pin"}

See [How to customize](/react-globe/customization/) for replacing the built-in controls.

## Limitations

- **Available after mount.** The ref is `null` until the globe has mounted; guard calls or use
  `onReady`.
- **Interaction cancels flights.** A drag, wheel or pinch during a flight stops it where it is.
