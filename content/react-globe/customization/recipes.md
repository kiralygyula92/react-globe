---
pluginId: react-globe
title: Recipes
description: Complete customization examples for common screens, each combining props, tokens and overrides.
date: 2026-09-15
---

## A dark dashboard globe

```tsx
const theme = {
  '--globe-color-label': 'rgb(203 213 225)',
  '--globe-color-cluster': 'rgb(56 189 248)',
  '--globe-color-cluster-text': 'rgb(2 6 23)',
  '--globe-surface-card': 'rgb(15 23 42)',
  '--globe-text-primary': 'white',
  '--globe-text-secondary': 'rgb(148 163 184)',
  height: 420,
} as React.CSSProperties;

<div style={theme}>
  <Globe renderStyle="modern" backgroundColor="rgb(2 6 23)" pins={pins} showPinPopup showControls />
</div>;
```

## A light, printed-atlas look for reports

```tsx
<Globe
  renderStyle="cartoon"
  backgroundColor="white"
  showCountryNames
  countryNamesMinZoom={2.4}
  enableRotation={false}
  enableTilt={false}
  defaultCamera={{ lat: 50, lng: 10, zoom: 2 }}
/>
```

## A hero globe that spins until someone interacts

```tsx
function Hero() {
  const globe = useRef<GlobeHandle>(null);
  return (
    <div style={{ height: 520 }} onPointerDown={() => globe.current?.stopAutoRotate()}>
      <Globe ref={globe} renderStyle="realistic" enableZoom={false} onReady={(g) => g.startAutoRotate(0.6)} />
    </div>
  );
}
```

`enableZoom={false}` leaves page scrolling alone on desktop.

## A route map with emphasised links

```tsx
const connections: PinConnection[] = routes.map((route) => ({
  id: route.id,
  from: route.origin,
  to: route.destination,
  animated: route.active,
  color: route.delayed ? 'rgb(248 113 113)' : undefined,
}));

<Globe pins={airports} connections={connections} enableConnections connectionWidth={1.5} archHeight={0.4} />;
```

Links without a `color` use `connectionColor`; delayed ones stand out.

## Clickable locations that open your own panel

```tsx
<Globe<Site>
  pins={sites}
  pinComponent={SiteMarker}
  onPinClick={(pin) => openPanel(pin.data)}
  onClusterClick={(clustered) => openList(clustered.map((p) => p.data))}
/>
```

Define `SiteMarker` outside the rendering component; see
[Overriding components](/react-globe/customization/overriding-components/).
