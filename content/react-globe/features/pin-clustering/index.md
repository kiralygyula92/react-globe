---
description: Merge pins that crowd together on screen into counted markers that open up as the camera comes closer.
symbols:
  - Globe
  - ClusterRenderProps
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/utils/clustering.ts
---

Clustering keeps a globe with hundreds or thousands of pins readable: from far away, nearby pins
become one marker with a count.

## Basics

Clustering is on by default, so dense pins merge into counted markers until you zoom in.

::demo{src="./demo-basics.tsx" title="400 pins, clustered"}

### Threshold

Pins cluster only while the camera is farther than `clusterZoomThreshold` (default `2`). Closer than
that, every pin is drawn individually.

### Radius

`clusterRadiusPx` (default `44`) is the screen-space distance within which pins merge. Pins on the far
side of the globe never join a cluster.

### Click

Clicking a cluster flies the camera to fit its pins. Pass `onClusterClick` to do something else with
the pins instead.

```tsx
<Globe pins={pins} onClusterClick={(clustered) => openList(clustered)} />
```

Turn clustering off with `enablePinClustering={false}`.

## Customization

Replace the marker with `clusterComponent`. Use the `messages.cluster(count)` it receives as the
accessible name so the marker stays localized.

::demo{src="./demo-customization.tsx" title="Custom cluster bubbles and click handling"}

See [Overriding components](/react-globe/customization/overriding-components/) for the other markers
you can replace.

## Limitations

- **Screen-space, not geographic.** Clusters are computed from projected positions, so they regroup
  as the globe turns or the camera moves.
- **All or nothing.** Every pin takes part in clustering; there is no per-pin opt-out. Lower
  `clusterZoomThreshold` or `clusterRadiusPx` so fewer pins merge, or turn clustering off.
