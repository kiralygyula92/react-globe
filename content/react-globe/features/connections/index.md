---
pluginId: react-globe
capabilityId: connections
title: Connections
description: Link pins with great-circle arches or surface lines, styled per link and optionally animated.
group: Content & data
plan: free
symbols:
  - Globe
  - DefaultConnection
  - PinConnection
  - ConnectionRenderProps
  - ConnectionType
  - ConnectionLineStyle
  - ConnectionPathPoint
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/layers/connections.ts
---

Connections show relationships between places: routes, transfers, network links. Each follows the
shortest path over the sphere.

## Basics

Pass `connections` that refer to pins by id and set `enableConnections`.

::demo{src="./demo-basics.tsx" title="Arches, a flowing link and a flat dashed line"}

### Type

`connectionType` (default `arch`) lifts links off the surface; `line` draws them flat on it. Both
follow the great circle.

### Height

`archHeight` (default `0.55`) is the peak lift, in globe radii, for two points on opposite sides of
the planet; shorter hops rise proportionally less.

### Stroke

`connectionLineStyle` (`solid`, `dashed`, `dotted`), `connectionWidth` in pixels (constant at every
zoom) and `connectionColor` set the default look.

### Animation

Set `animated: true` on a connection for a flowing stroke. A solid link has no pattern to move, so an
animated one is drawn dashed. The flow stops under `prefers-reduced-motion`.

### Per-link overrides

A connection's own `type`, `archHeight`, `lineStyle`, `color` and `width` override the matching prop,
so most links can share one look while a few stand out.

:::warning
A connection whose `from` or `to` does not match a pin id is skipped, with a development warning.

```tsx
// Wrong: 'paris' is not the id of any pin
const connections = [{ id: 'l1', from: 'london', to: 'paris' }];
```
:::

## Customization

Pass `connectionComponent` to draw connections as SVG you control. It receives the projected,
occlusion-tested path; the package's own SVG renderer, `DefaultConnection`, can be wrapped or reused.

::demo{src="./demo-customization.tsx" title="Wrapping DefaultConnection with a glow"}

See [Overriding components](/react-globe/customization/overriding-components/) for how render
overrides receive their props.

## Limitations

- **Pins at both ends.** Connections join pins, not free coordinates. To connect points without a
  visible marker, pass a `pinComponent` that renders nothing for those pins.
- **SVG overrides cost more.** The built-in connections are WebGL lines; `connectionComponent` renders
  every connection as DOM SVG, re-projected as the camera moves.
