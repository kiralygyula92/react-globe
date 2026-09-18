---
description: Convert between coordinates on the globe and pixel positions in its container.
symbols:
  - GlobeHandle
  - ScreenPoint
  - LatLng
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/utils/coordinates.ts
---

## Basics

`screenToLatLng(x, y)` returns the coordinate under a point in the container.

::demo{src="./demo-basics.tsx" title="Coordinates under the pointer"}

### Coordinate to screen

`latLngToScreen({ lat, lng })` returns the pixel position of a coordinate, or `null` while the globe
hides it.

### Screen to coordinate

`screenToLatLng(x, y)` returns the coordinate under a point, or `null` when that point misses the
globe.

### Container space

Both methods use the container's coordinate space, origin at its top-left, in CSS pixels. Subtract the
container's bounding rectangle from pointer event coordinates first.

## Customization

Position your own HTML over the globe by projecting a coordinate every frame.

::demo{src="./demo-customization.tsx" title="An HTML badge that follows a coordinate"}

For overlays the globe positions for you, prefer [pins](/react-globe/pins/) with a `pinComponent`; see
[Overriding components](/react-globe/customization/overriding-components/).

## Limitations

- **Surface points only.** Projection works on the globe's surface; it does not account for the lift of
  an arched connection.
- **You drive the loop.** The globe does not notify you when a projected point moves; re-project from
  `onCameraChange` or an animation frame, as the demo does.
