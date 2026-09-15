---
pluginId: react-globe
capabilityId: camera
title: Camera
description: Choose where the globe opens, limit how close and far it goes, and drive the camera from React state.
group: Core features
plan: free
symbols:
  - Globe
  - CameraPose
  - LatLng
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/defaults.ts
---

The camera decides what the reader sees first and how far they can wander. Set it once for an
opening view, or keep it in state to move the globe from your own UI.

## Basics

Pass `defaultCamera` for the opening pose and read every change from `onCameraChange`.

::demo{src="./demo-basics.tsx" title="Opening pose and live camera readout"}

### Pose

A `CameraPose` has four members, all optional where a pose is accepted:

- `lat` and `lng` — the point the camera is centred over, in degrees. Latitude is clamped to ±85.
- `zoom` — the camera's **distance from the globe's centre** in globe radii, so smaller is closer.
  With the 50° field of view across the shorter side, the whole planet is in frame from about 2.4 outward; the default 3.2 leaves room to zoom in before the edges leave the frame.
- `tilt` — degrees away from looking straight down, clamped to 0–75.

### Uncontrolled

`defaultCamera` sets the opening pose; members you leave out fall back to
`{ lat: 20, lng: 0, zoom: 3.2, tilt: 0 }`. `defaultCenter` is a shortcut for "open over this place".
Where both name a latitude or longitude, `defaultCamera` wins. That pose is also **home**: where
`reset()` and the reset button return.

### Controlled

Pass `camera` to drive the pose from state. Each change animates the camera there, and `camera` wins
over `defaultCamera` (passing both logs a development warning).

### Distance limits

`minZoom` and `maxZoom` bound the distance for gestures, buttons and the imperative API.

```tsx
<Globe minZoom={1.5} maxZoom={3} />
```

:::warning
`camera` animates whenever its identity changes. An inline object combined with state set from
`onCameraChange` re-renders on every drag and pulls the camera back.

```tsx
// Wrong: a new object every render fights the user's drag
<Globe camera={{ lat, lng, zoom: 2 }} onCameraChange={(p) => { setLat(p.lat); setLng(p.lng); }} />
```

Keep the pose in one state object or a memoised value, and only change it when you mean to move the
camera.
:::

## Customization

Drive the camera from your own buttons by keeping a stable pose per destination.

::demo{src="./demo-customization.tsx" title="A controlled camera with preset destinations"}

For flights, zoom steps and reset from code, see the [Camera API](/react-globe/camera-api/). For
replacing the built-in buttons, see [Overriding components](/react-globe/customization/overriding-components/).

## Limitations

- **`camera` does not lock the view.** The reader can still drag, tilt and zoom away from a controlled
  pose; the globe returns only when `camera` changes again. Turn off `enableRotation`, `enableTilt` and
  `enableZoom` to pin the view.
- **Fixed field of view.** The 50° field of view cannot be changed.
