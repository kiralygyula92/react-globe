# 08 — Step-by-step: using the globe in another application

This is the guide for the *other* direction: you have the package (or the extracted folder), and
you want to reproduce in a new app exactly what Wanderglobe currently does with it.

Two halves:

- **Part A** — get a working globe on screen. Six steps, applies to any app.
- **Part B** — reproduce the three specific integrations Wanderglobe has today.

---

# Part A — getting a globe on screen

## Step 1 — Install

```bash
pnpm add @yourscope/react-globe three
pnpm add -D @types/three
```

`react` and `react-dom` are peers you already have. **`three` is a peer dependency you must
install yourself** — that is deliberate, so your app controls the version and there is only ever
one copy in the bundle.

If you are copying the folder rather than installing a package, drop `src/features/globe/` into
your source tree, then work through `07-PACKAGING.md` §1–4 (Tailwind, tokens, `?url`, `__DEV__`)
before anything will build.

## Step 2 — Import the stylesheet

Once, at your app entry:

```tsx
import '@yourscope/react-globe/globe.css';
```

Skip this only if you took packaging option B (host-app Tailwind), in which case add instead:

```css
@import "tailwindcss";
@source "../node_modules/@yourscope/react-globe/dist";
```

## Step 3 — Give the container a size

The component fills its container. This is the single most common first mistake:

```tsx
// Nothing renders — the container has no height.
<div><Globe /></div>

// Correct.
<div className="h-[32rem]"><Globe /></div>
<div style={{ height: 500 }}><Globe /></div>
<Globe height={500} />                     // or size the component itself
```

## Step 4 — Render it

```tsx
import { Globe } from '@yourscope/react-globe';

export function Somewhere() {
  return (
    <div className="h-[32rem]">
      <Globe />
    </div>
  );
}
```

Zero props gives a physical-map Earth with shorelines and country borders, left-drag orbit,
right-drag tilt and wheel zoom.

## Step 5 — Vite dev-server config (Vite apps only)

The module lazily imports `three/examples/jsm/lines/*`. Left for Vite to discover mid-session, the
dev server re-optimises and answers whatever else is in flight with a **504** — which in the
original app was intermittently breaking an unrelated dynamic import elsewhere on the page.

```ts
// vite.config.ts
optimizeDeps: {
  include: [
    'three',
    'three/examples/jsm/lines/Line2.js',
    'three/examples/jsm/lines/LineGeometry.js',
    'three/examples/jsm/lines/LineMaterial.js',
    'three/examples/jsm/lines/LineSegments2.js',
    'three/examples/jsm/lines/LineSegmentsGeometry.js',
  ],
}
```

Dev only. Production builds never needed it.

## Step 6 — Decide how it loads

| You need | Use |
|---|---|
| The screen always shows a globe, and the screen is already deferred | `Globe` |
| The screen might show a globe | `GlobeLazy` |
| three.js must not appear in this chunk at all | Your own `lazy(() => import('./YourGlobeWrapper'))` |

The third case exists because the barrel re-exports `Globe` **statically**: a module that
statically imports anything from the package pulls `Globe.tsx` into its own chunk even if it only
names `GlobeLazy`. Wrapping your own component and importing *that* dynamically is what actually
keeps three out:

```tsx
const AdventureGlobe = lazy(() =>
  import('@/features/globe-stage').then((m) => ({ default: m.AdventureGlobe })));
```

Verify it worked by grepping the built output: `dist/assets/index-*.js` should contain no
reference to `three.module-*.js`.

---

# Part B — reproducing Wanderglobe's three integrations

Wanderglobe uses the globe in exactly three places. Each is a small wrapper around the same sealed
component — that is the whole point of the design, and it is what you are reproducing.

## B1 — The playground / demo route

The full control panel, described completely in `05-DEMO-APP.md`.

In Wanderglobe it is registered as a lazy route so the playground module is never in the main
bundle:

```tsx
{
  path: '/__dev/globe',
  lazy: async () => {
    const { GlobePlayground } = await import('./playground/GlobePlayground');
    return { Component: GlobePlayground };
  },
}
```

**One detail that will bite you if you have a second globe on the page:** the playground owns the
whole viewport, so the app's ambient backdrop globe must stand down while it is open, keeping the
page to one WebGL context. In Wanderglobe that is a small zustand store:

```tsx
lazy: async () => {
  const [{ GlobePlayground }, { useGlobeMode }] = await Promise.all([
    import('@/features/globe/playground/GlobePlayground'),
    import('@/scene/hooks/useGlobeMode'),
  ]);
  return {
    Component: function GlobeDevRoute() {
      useGlobeMode('hidden');     // the backdrop unmounts
      return <GlobePlayground />;
    },
  };
}
```

If your app has only one globe, skip this entirely.

## B2 — The ambient backdrop globe

A full-window, blurred, non-interactive globe behind every screen. This is the pattern for using
the globe as **scenery**, and every prop below is doing performance work.

```tsx
export function AmbientGlobe() {
  const mode = useGlobeModeStore((s) => s.mode);
  if (mode === 'stage' || mode === 'hidden') return null;   // unmounts on the stage route

  const blurred = mode === 'ambient-blurred';
  const dim = mode === 'ambient-dim';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-[opacity,filter]"
      style={{
        opacity: dim ? 0.22 : blurred ? 0.4 : 0.45,
        filter: blurred ? 'blur(12px)' : 'blur(8px)',
      }}
    >
      {/*
        Drawn at half size and scaled back up: a quarter of the pixels for a
        backdrop the page then blurs by 8 px, where the difference is invisible.
      */}
      <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-200">
        <GlobeLazy
          className="h-full w-full"
          backgroundColor="transparent"
          // Scenery: nothing here should compete with the page for the pointer.
          enableRotation={false}
          enableTilt={false}
          enableZoom={false}
          // Under an 8–12 px blur the vector layers are invisible, so the backdrop
          // does not pay to download 1.4 MB of coastlines and borders to hide them.
          showShorelines={false}
          showCountryBorders={false}
          defaultCamera={{ lat: 22, lng: 8, zoom: 3.4 }}
        />
      </div>
    </div>
  );
}
```

Five decisions worth copying verbatim:

1. **It does not auto-rotate.** The globe only redraws when something changes, so a still backdrop
   costs almost nothing per frame; a rotating one re-renders the whole window sixty times a second
   behind every screen, for motion the blur hides anyway. This one change took a measured
   navigation from 6.8 s back to 2.8 s under software rendering.
2. **Half resolution, scaled up.** A quarter of the pixels, behind a blur.
3. **Vector layers off.** Invisible under the blur, and 1.4 MB not downloaded.
4. **`zoom: 3.4`** — beyond the 2.4-radii threshold, so the land mesh is never triangulated at all.
   A globe parked at arm's length never pays that 270 ms.
5. **It unmounts on the route that has its own globe**, which is what keeps the app to one WebGL
   context.

Mount it once, above the router:

```tsx
const AmbientGlobe = lazy(() => import('@/features/globe-stage').then((m) => ({ default: m.AmbientGlobe })));

createRoot(root).render(
  <StrictMode>
    <div className="relative min-h-dvh">
      <Suspense fallback={null}><AmbientGlobe /></Suspense>
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
);
```

## B3 — The interactive stage globe

The real one: pins from your domain data, connections between them, a controlled camera driven by
a playback director, and a popup that renders your own components.

The shape of the wiring:

```tsx
export function AdventureGlobe() {
  const handleRef = useRef<GlobeHandle>(null);

  // 1. Map your domain objects onto pins and connections, memoised.
  const pins = useMemo<Pin<MomentData>[]>(
    () => [...activitiesToPins(activities, adventure), ...landmarkPins()],
    [activities, adventure],
  );
  const connections = useMemo(
    () => activitiesToConnections(activities, isPlaying),
    [activities, isPlaying],
  );

  // 2. Controlled camera ONLY while the director is flying; otherwise the
  //    visitor's own orbit must win.
  const camera = useMemo<CameraPose | undefined>(() => {
    if (!directorDriving) return undefined;
    const activity = activities.find((a) => a.id === activeActivityId);
    return activity ? { lat: activity.place.lat, lng: activity.place.lng, zoom: 1.5 } : undefined;
  }, [directorDriving, activities, activeActivityId]);

  return (
    <GlobeLazy
      ref={handleRef}
      className="h-full w-full"
      camera={camera}
      defaultCamera={{ zoom: 3.0 }}
      minZoom={1.02}                       // well past the module default; the point is to
      maxZoom={3.0}                        // see where a moment actually happened
      pins={pins}
      showPinPopup
      pinPopupComponent={ActivityPopup}    // your own React
      onPinHover={(pin) => setHoveredActivityId(pin?.data?.activityId ?? null)}
      onPinClick={(pin) => setFocusedActivityId(pin.data?.activityId ?? null)}
      enableConnections
      connections={connections}
    />
  );
}
```

### The five patterns to take from it

**1. Domain mapping lives outside the globe.** A `globeMapping.ts` module converts your entities
into `Pin[]` and `PinConnection[]`. The globe never learns what an "activity" is; that is the
isolation contract working.

**2. Controlled vs uncontrolled is a *mode*, not a setting.** Pass `camera` only while something
else is driving. The instant the user should be in charge, pass `undefined` — otherwise every
orbit gesture is fought by the controlled prop animating back.

**3. `minZoom` / `maxZoom` are per-screen.** The module defaults (1.1–4.0) suit a general map; a
screen whose job is "look at this exact place" wants a much tighter range.

**4. Hover and click go to your store, not to local state.** `onPinHover` gives you the pin;
translate it back to your domain id and dispatch. Remember the marker still highlights on its own
— you are replacing the reporting, not the visual.

**5. Mount it on an idle callback if it sits behind a router transition.** A component that
suspends during a navigation suspends the whole transition, so a lazy globe leaves the visitor
looking at the page they just left. In Wanderglobe:

```tsx
const [ready, setReady] = useState(false);
useEffect(() => {
  const id = requestIdleCallback(() => setReady(true), { timeout: 500 });
  return () => cancelIdleCallback(id);
}, []);
return ready ? <Suspense fallback={null}><AdventureGlobe /></Suspense> : <Placeholder />;
```

---

# Part C — checklist for a faithful reproduction

Work through this after Part A and B. Each line is something that was got wrong at least once.

### Rendering
- [ ] `<Globe />` with zero props renders a globe (not a blank box → check the container height).
- [ ] All four `renderStyle` values draw visibly different globes.
- [ ] `colorScheme="grayscale"` drains the globe but **not** the pins, labels or popups.
- [ ] No `THREE.Color` warning in the console when `backgroundColor` is a `var(--token)`.
- [ ] The console is clean on every style — a GLSL error only ever shows up at runtime.

### Interaction
- [ ] Left-drag orbits, and glides on release.
- [ ] Dragging right moves the centred longitude **west**.
- [ ] Right-drag tilts, and the grabbed point stays under the cursor.
- [ ] A hard right-drag runs the tilt to 75° without throwing the globe across the world.
- [ ] Wheel zooms; with `enableZoom={false}` the page scrolls instead.
- [ ] Right-click inside the canvas shows no context menu; right-click outside it does.
- [ ] Two-finger pinch zooms on a touch device.

### Data
- [ ] Country hover highlights the correct country (check an island and a country crossing the
      antimeridian).
- [ ] `showCountryNames` labels do not overlap each other.
- [ ] Capitals appear only at or below `capitalsMinZoom`.
- [ ] A connection with an unknown pin id warns and is skipped; the others still draw.
- [ ] An animated solid connection draws as dashed.

### Performance
- [ ] With nothing moving, the tab's CPU use drops to near zero (check with the Performance panel:
      `renderer.render` should stop appearing).
- [ ] Scrolling the globe out of view stops the loop.
- [ ] Switching tabs stops the loop.
- [ ] Navigating away and back twenty times produces no `webglcontextlost` events and leaves
      exactly one canvas.
- [ ] 5 000 pins stay interactive.

### Integration
- [ ] Only one WebGL context is alive at a time if you have more than one globe.
- [ ] The globe's overlays never draw over your app's modals (check the `isolate` class survived
      your CSS pipeline).
- [ ] A forced globe failure shows the fallback and leaves the rest of the screen working.
- [ ] `prefers-reduced-motion` stops flights, auto-rotate, cloud drift and connection flow.

---

# Appendix — troubleshooting

| Symptom | Cause |
|---|---|
| Blank box, no canvas | Container has no height. |
| Globe renders mirrored, or countries are in the wrong hemisphere | `latLngToVector3` no longer matches `SphereGeometry`'s vertex formula. Run the landmark test. |
| North pole at the south | A `flipY` mismatch — an `ImageBitmap` decoded with `imageOrientation: 'flipY'` being flipped again. |
| Physical map looks nothing like satellite imagery | The same `flipY` bug, but on the *canvas* read-back path: the rasters are being sampled upside down. |
| A band of one country's colour smeared around the limb | Either an antimeridian triangle that was not dropped, or a wrong-wound triangle, or `polygonOffset` on the land mesh. |
| Faint diamonds in the open ocean | A mip level coarser than 4 being sampled for the shelf. |
| The ocean ends in a staircase or an octagon | The distance field is not a true Euclidean transform. |
| `instanceof` checks failing inside three | Two copies of three in the bundle — check `external: [..., /^three\//]`. |
| 504 from the dev server on an unrelated dynamic import | Missing `optimizeDeps.include` for the three line modules. |
| Page will not scroll over the globe | `enableZoom` is on; that is correct behaviour. Set it `false` for decorative globes. |
| Pins ten times too large near `minZoom` | Sizing against `zoom` instead of `zoom - 1`. |
| Hovering across a map slowly leaks GPU memory | The highlight layer is replacing an attribute instead of swapping whole geometries. |
| Everything is slow behind a blur | An auto-rotating backdrop. Turn it off; see B2. |
