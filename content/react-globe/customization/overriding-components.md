---
description: Replace the pin marker, popup, cluster marker, connections or controls with your own React components.
date: 2026-09-15
---

Five parts of the globe accept a component of your own. Each receives typed props; the globe keeps
positioning it, so your component only draws.

- The pin marker — see [Pins](/react-globe/pins/) and [`PinRenderProps`](/react-globe/api/pin-render-props/).
- The hover popup — see [Pin popups](/react-globe/pin-popups/) and
  [`PinPopupRenderProps`](/react-globe/api/pin-popup-render-props/).
- The cluster marker — see [Pin clustering](/react-globe/pin-clustering/) and
  [`ClusterRenderProps`](/react-globe/api/cluster-render-props/).
- Connections — see [Connections](/react-globe/connections/) and
  [`ConnectionRenderProps`](/react-globe/api/connection-render-props/).
- The controls — see [Controls](/react-globe/controls/) and
  [`GlobeControlsRenderProps`](/react-globe/api/globe-controls-render-props/).

The prop names and their types are in the generated [`Globe` reference](/react-globe/api/globe/).

## Pointer events

Overrides render into an overlay that has `pointer-events: none`, so drags pass through to the globe.
Anything a reader should click must opt back in:

```tsx
<button type="button" style={{ pointerEvents: 'auto' }} onClick={onClick}>…</button>
```

## Positioning

- **Pins, popups and clusters** are placed on an anchor at their point. Centre your element on it — for
  example with `transform: translate(-50%, -50%)` — and apply the `scale` prop where given to keep a
  constant apparent size.
- **Connections** render inside an `<svg>` that covers the canvas; draw paths from the projected `path`.
  `DefaultConnection`, the package's SVG renderer, can be wrapped or reused.
- **Controls** render inside the globe's container, which is the positioning context; place them with
  absolute positioning.

## Staying accessible and translated

Cluster markers and controls receive the resolved `messages`. Use them as accessible names so your
replacement follows the globe's [`locale`](/react-globe/localization/):

```tsx
function ZoomIn({ zoomIn, canZoomIn, messages }: GlobeControlsRenderProps) {
  return <button type="button" aria-label={messages.zoomIn} onClick={zoomIn} disabled={!canZoomIn}>+</button>;
}
```

## Keep override components stable

Define override components outside the component that renders the globe. A component created inside
render is a new type every time, so React remounts every marker on each render.

## Examples

Each capability page's Customization section has a live override: [Pins](/react-globe/pins/),
[Pin popups](/react-globe/pin-popups/), [Pin clustering](/react-globe/pin-clustering/),
[Connections](/react-globe/connections/) and [Controls](/react-globe/controls/).
