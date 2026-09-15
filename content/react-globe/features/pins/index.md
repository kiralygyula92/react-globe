---
pluginId: react-globe
capabilityId: pins
title: Pins
description: Place markers at coordinates, react to hover and click, and draw them as WebGL instances or as your own components.
group: Content & data
plan: free
symbols:
  - Globe
  - Pin
  - PinRenderProps
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/core/layers/PinLayer.ts
---

Pins mark places: offices, sensors, events, anything with a latitude and longitude. Use them when
you need markers that hide behind the globe as it turns and respond to the pointer.

## Basics

Pass an array of `Pin` objects, each with a unique `id`, a coordinate and optional `data`.

::demo{src="./demo-basics.tsx" title="Four pins with popups"}

### Marker

Without `pinComponent`, every pin is one instance of a single WebGL mesh, highlighted on hover. With
`pinComponent`, each visible, unclustered pin becomes your own DOM element, positioned and rotated to
the surface for you.

### Events

`onPinHover` fires with the pin under the pointer, or `null` when the pointer leaves every pin.
`onPinClick` fires for a press that was not a drag, and the click toggles that pin's `selected` state.

```tsx
<Globe
  pins={pins}
  onPinHover={(pin) => setHovered(pin?.id ?? null)}
  onPinClick={(pin) => navigate(`/places/${pin.id}`)}
/>
```

## Keep payloads typed

`Globe` is generic over the payload type, so `data` is typed in every callback and override.

```tsx
type Office = { city: string; staff: number };

<Globe<Office> pins={offices} onPinClick={(pin) => console.log(pin.data?.staff)} />;
```

:::warning
Do not rebuild the `pins` array on every render. A new array identity resets hover and selection and
re-projects every pin.

```tsx
// Wrong: a new array each render
<Globe pins={rows.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng }))} />
```

Memoise it instead: `const pins = useMemo(() => rows.map(toPin), [rows]);`
:::

## Customization

Replace the marker with any React component. The wrapper is already positioned; centre your element
on it and apply `scale` to keep a constant apparent size as the camera moves.

::demo{src="./demo-custom-marker.tsx" title="Custom DOM markers"}

See [Overriding components](/react-globe/customization/overriding-components/) for every override
and the props each receives.

## Limitations

- **DOM markers cost more.** `pinComponent` renders one element per visible pin and repositions each
  every frame. For thousands of pins keep the built-in marker, or enable
  [clustering](/react-globe/pin-clustering/).
- **No marker for clustered or hidden pins.** A custom pin exists only while it is on the visible side
  and not merged into a cluster, so `occluded` is always `false`. Use `latLngToScreen` from the
  [Camera API](/react-globe/camera-api/) to track a pin that is out of view.
- **Changing `pins` resets interaction state.** Hover and selection clear whenever a new array is
  passed.
