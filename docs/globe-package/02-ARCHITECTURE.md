# 02 — Architecture and implementation

How the pieces fit, and the exact behaviour of each. Constants given here are the ones the
original ships; they were arrived at by measurement, so change them only deliberately.

---

## 1. The big picture

```
<Globe>                     public component; wraps everything in an error boundary
 └─ <GlobeCore>             the React half: props → engine, overlays, hit-testing
     ├─ container <div>     data-globe-root, position:relative, isolate, overflow:hidden
     │   ├─ <canvas>        appended by GlobeEngine
     │   └─ overlay <div>   absolute inset-0, pointer-events-none, isolate
     │       ├─ <svg>       custom connections only
     │       ├─ graticule labels
     │       ├─ country labels
     │       ├─ capital markers
     │       ├─ DOM pins (only when pinComponent is given)
     │       ├─ cluster markers
     │       ├─ pin popup
     │       ├─ country tooltip
     │       └─ controls
     └─ GlobeEngine         the three.js half; owns the scene, camera, loop
         ├─ PointerControls
         ├─ SurfaceLayer  (+ LandLayer)
         ├─ VectorLayer
         ├─ GraticuleLayer
         ├─ HighlightLayer
         ├─ PinLayer
         └─ ConnectionLayer
```

**The division of labour, stated once:** React owns *what exists*; the engine owns *where it is*.
Overlay elements are React children, but their `transform` is written straight to the DOM node
every frame by `OverlayPositioner`. Nothing that changes every frame goes through React state.

### Why plain three.js

The isolation contract asks for a folder that can be lifted out as a package. Driving three
directly leaves the package depending on `three` alone instead of `three` +
`@react-three/fiber` + `@react-three/drei`. (In the original there was also a repo guard capping
the number of `<Canvas>` elements, but the packaging argument is the one that decides it.)

---

## 2. `GlobeEngine`

`src/core/GlobeEngine.ts`. One class, constructed once per mount with the container element and a
callbacks object.

```ts
export type EngineCallbacks = {
  onCameraChange(pose: Required<CameraPose>): void;
  onFrame(): void;
  onPointerMove(local: ScreenPoint, event: PointerEvent): void;
  onPointerLeave(): void;
  onPointerDown(local: ScreenPoint, event: PointerEvent): void;
  onPointerUp(local: ScreenPoint, event: PointerEvent): void;
  onError(error: Error): void;
};
```

### 2.1 Constants

```ts
const FOV = 50;      // degrees
const NEAR = 0.01;
const FAR = 100;
```

**Why 50° and not something narrower.** A camera `d` radii out needs a half-angle of at least
`asin(1/d)` to see the whole planet. At 38° that is 3.07 radii, so the default pose of 2.6 would
show a cropped globe. 50° puts the whole planet in frame from 2.4 radii outward without visible
fisheye.

### 2.2 Renderer setup

```ts
this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
this.renderer.outputColorSpace = SRGBColorSpace;
this.renderer.toneMapping = ACESFilmicToneMapping;
this.renderer.toneMappingExposure = 1.05;
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
```

The canvas gets `display:block; width:100%; height:100%; touch-action:none` and is appended to
the container.

Scene graph: a `Group` (`root`) holds, in this order, `surface.group`, `graticule.group`,
`vectors.group`, `highlight.mesh`, `connections.group`, `pins.group`. The scene holds `root`, an
`AmbientLight(rgb(150,172,205), 1.15)` and a `DirectionalLight(rgb(255,248,236), 2.4)`.

**Constructor must throw or report on failure.** Wrap `new GlobeEngine(...)` in a `try/catch` in
`Globe.tsx`; a browser with no WebGL throws out of the `WebGLRenderer` constructor.

### 2.3 The camera model

This is the heart of the component. `lat`/`lng` name the surface point the view is centred on;
`zoom` is the distance from the globe's centre in radii; `tilt` swings the camera around that
centred point so the point stays put while the horizon rises.

```ts
private applyPoseToCamera(): void {
  const dir   = latLngToVector3(this.pose.lat, this.pose.lng, 1, this.scratchA);
  const east  = this.scratchB.set(0, 1, 0).cross(dir).normalize();   // up × dir
  const north = this.scratchC.copy(dir).cross(east).normalize();     // dir × east

  const tilt   = this.pose.tilt * DEG;
  const camDir = dir.clone().applyAxisAngle(east, tilt);
  const up     = north.clone().applyAxisAngle(east, tilt);

  this.camera.position.copy(camDir).multiplyScalar(this.pose.zoom);
  this.camera.up.copy(up);
  this.camera.lookAt(dir);
  this.camera.updateMatrixWorld();

  // A key light just off the camera axis: enough shading to read as a sphere,
  // without a dead black hemisphere in the middle of a UI.
  this.sun.position.copy(this.camera.position).applyAxisAngle(up, 0.45).multiplyScalar(1.2);
  this.sun.position.addScaledVector(up, 0.35 * this.pose.zoom);
}
```

Consequences worth stating:

- The camera's distance from the centre is exactly `zoom` **whatever the tilt**.
- It looks at `dir` — the surface point — so the centred coordinate stays centred as tilt changes.
- `camera.up` is `north` rotated by the same amount, which keeps the horizon level.
- The latitude clamp of ±85° is what keeps `east = up × dir` well-defined.

### 2.4 Pose application and the dirty flag

```ts
private setPoseInternal(pose: Required<CameraPose>): void {
  const clamped = clampPose(pose, this.minZoom, this.maxZoom);
  const changed = clamped.lat !== this.pose.lat || clamped.lng !== this.pose.lng
               || clamped.zoom !== this.pose.zoom || clamped.tilt !== this.pose.tilt;
  this.pose = clamped;
  if (changed) {
    this.needsRender = true;
    this.applyPoseToCamera();
    this.callbacks.onCameraChange(this.getPose());
  }
}
```

`getPose()` returns a **copy**. `invalidate()` sets `needsRender = true` and is the public way for
any layer mutation to ask for a redraw.

### 2.5 `swingPose` — the tilt anchor primitive

Turns the camera so the coordinate currently under `from` lands where `to` is.

```ts
swingPose(from: LatLng, to: LatLng): void {
  const a = latLngToVector3(from.lat, from.lng, 1).normalize();
  const b = latLngToVector3(to.lat, to.lng, 1).normalize();
  if (a.distanceToSquared(b) < 1e-12) return;

  // Rotating the camera by Q moves a fixed world point to where its inverse
  // sat, so taking Q from `a` to `b` brings `b` to where `a` is now.
  const swing  = new Quaternion().setFromUnitVectors(a, b);
  const centre = latLngToVector3(this.pose.lat, this.pose.lng, 1).applyQuaternion(swing);

  const next = vector3ToLatLng(centre);
  this.setPoseInternal({ ...this.pose, lat: next.lat, lng: next.lng });
}
```

**Why this and not a degrees-per-pixel nudge.** The first version nudged the centred coordinate by
the pivot's screen error times a degrees-per-pixel scalar. That scalar is only right for a flat-on
view: once the camera tilts, a pixel of vertical error near the horizon is worth far more latitude
than one near the centre, so the correction overshot, the next pass overshot further, and the
planet jumped away from the grab. Solved as the rotation it actually is, the grabbed point holds
to within 0.2 px through 28° of tilt.

### 2.6 Camera commands

| Method | Behaviour |
|---|---|
| `setCamera(pose, opts)` | Fills missing members from the current pose, clamps, cancels inertia, sets `zoomTarget`. `animate !== false && !reducedMotion` starts a flight; otherwise jumps. |
| `flyTo(target, opts)` | `setCamera({ lat, lng, zoom: opts?.zoom ?? current }, { animate: true, durationMs })`. |
| `nudgeZoom(factor)` | Cancels any flight, multiplies `zoomTarget` by `factor`, clamped. The damping in `PointerControls.update` eases the actual zoom towards it. |
| `rotateBy(degrees)` | `setCamera({ lng: pose.lng + degrees }, { animate: true, durationMs: 320 })`. |
| `startAutoRotate(speed = 1)` / `stopAutoRotate()` | Sets `autoRotateSpeed`; the loop advances longitude by `speed * AUTO_ROTATE_SPEED * 180 * delta / PI` degrees per frame, skipped under reduced motion or during a flight. |
| `setClamps(min, max)` | Stores them, re-applies the current pose through the clamp, and clamps `zoomTarget`. |
| `setBackground(color)` | See §2.9. |
| `setReducedMotion(bool)` | Stored; consulted by flights, auto-rotate, cloud drift and connection flow. |

**Flights.** A `Flight` holds `from`, `to`, a **shortest-path** `deltaLng` (via `wrapLng`, so a
flight never takes the long way round), `elapsed` and `duration`. Each frame:

```ts
flight.elapsed += delta * 1000;
const t = Math.min(1, flight.elapsed / flight.duration);
const eased = easeInOut(t);   // t < 0.5 ? 4t³ : 1 - (-2t+2)³/2
setPoseInternal({
  lat:  from.lat  + (to.lat  - from.lat)  * eased,
  lng:  wrapLng(from.lng + deltaLng * eased),
  zoom: from.zoom + (to.zoom - from.zoom) * eased,
  tilt: from.tilt + (to.tilt - from.tilt) * eased,
});
if (t >= 1) this.flight = null;
```

Any user interaction cancels the flight (`onInteractionStart` sets `this.flight = null`).

### 2.7 Projection

```ts
projectInto(lat, lng, radius, out): ProjectedPoint   // lat/lng → screen, into a reused object
projectVectorInto(world: Vector3, out): ProjectedPoint
```

`projectVectorInto` does:

```ts
const occluded = this.isOccluded(world);
const projected = this.scratchB.copy(world).project(this.camera);
out.x = (projected.x * 0.5 + 0.5) * this.width;
out.y = (-projected.y * 0.5 + 0.5) * this.height;
out.visible = !occluded && projected.z < 1;
```

**Occlusion** is a segment-to-centre test, not a simple dot product, so it also works for lifted
geometry — an arch is only hidden where its own chord dips inside the sphere:

```ts
private isOccluded(world: Vector3): boolean {
  const toCamera = scratchC.copy(this.camera.position).sub(world);
  const lengthSq = toCamera.lengthSq();
  if (lengthSq < 1e-9) return false;
  const t = clamp(-world.dot(toCamera) / lengthSq, 0, 1);
  const closestSq = (world.x + toCamera.x * t) ** 2
                  + (world.y + toCamera.y * t) ** 2
                  + (world.z + toCamera.z * t) ** 2;
  return closestSq < 0.9985 * 0.9985;   // slightly inside the surface, so grazing points stay visible
}
```

`latLngToScreen(point)` returns `null` when the result is not visible. `screenToLatLng(x, y)`
raycasts to a unit `Sphere` and returns `null` on a miss.

### 2.8 Resize

A `ResizeObserver` on the container. On a real change: update `camera.aspect`,
`updateProjectionMatrix()`, `renderer.setSize(w, h, false)` — note the `false`, the canvas CSS
size is already 100 % — and push `width * pixelRatio, height * pixelRatio` into **all three line
layers** (`vectors`, `graticule`, `connections`), because screen-space line widths are
resolution-relative. Set `needsRender = true`.

### 2.9 Background colour and design tokens

A consumer naturally reaches for a design token here, because `backgroundColor` is a CSS-shaped
prop. CSS resolves `var(--x)` on its own; three's colour parser does not — it warns and paints
white. So resolve the token against the container first:

```ts
private resolveColor(color: string): string {
  const token = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(color.trim());
  if (!token) return color;
  const value = getComputedStyle(this.container).getPropertyValue(token[1]).trim();
  return value || token[2]?.trim() || 'transparent';
}

setBackground(color: string): void {
  this.needsRender = true;
  const resolved = this.resolveColor(color);
  if (resolved === 'transparent') {
    this.renderer.setClearColor(0x000000, 0);
    this.scene.background = null;
  } else {
    const parsed = new Color(resolved);
    this.renderer.setClearColor(parsed, 1);
    this.scene.background = parsed;
  }
}
```

This is the *only* place the module touches a design token, and it arrives through the DOM rather
than through an import — which is what keeps the module sealed.

`Globe.tsx` also mirrors the value onto the container's inline `background` (unless
`'transparent'`), so the DOM behind a transparent canvas matches.

### 2.10 The frame loop

Three gates decide whether the loop runs at all:

```ts
private syncRunning(): void {
  const shouldRun = !this.disposed && this.onScreen && this.pageVisible;
  ...
}
```

- `onScreen` comes from an `IntersectionObserver` with `threshold: 0` on the container.
- `pageVisible` comes from `document.visibilitychange`.

The tick itself:

```ts
private readonly tick = (now: number): void => {
  if (!this.running) return;
  this.rafId = requestAnimationFrame(this.tick);

  // Clamped so a backgrounded tab returning does not jump the animation.
  const delta = this.lastTime === 0 ? 0.016 : Math.min(0.1, (now - this.lastTime) / 1000);
  this.lastTime = now;

  this.advanceFlight(delta);
  this.controls.update(delta);

  if (this.autoRotateSpeed !== 0 && !this.reducedMotion && !this.flight) {
    this.setPoseInternal({ ...this.pose, lng: wrapLng(this.pose.lng + this.autoRotateSpeed * AUTO_ROTATE_SPEED * 180 * delta / Math.PI) });
  }

  if (this.surface.update(delta, this.reducedMotion)) this.needsRender = true;
  if (this.connections.update(delta, this.reducedMotion)) this.needsRender = true;
  this.pins.setZoom(this.pose.zoom);
  if (this.surface.setZoom(this.pose.zoom)) this.needsRender = true;

  // A globe nobody is touching should cost nothing.
  if (!this.needsRender) return;
  this.needsRender = false;

  this.callbacks.onFrame();
  this.renderer.render(this.scene, this.camera);
};
```

**This is the performance contract.** The loop still runs every frame to advance input damping and
animation, but `renderer.render` *and* the overlay pass are skipped entirely when nothing has
changed. Every layer mutation calls `invalidate()`; `Globe.tsx` does the same after each
prop-sync effect. Cloud drift steps at 10 Hz rather than per frame, which is what lets an
untouched globe fall from sixty redraws a second to ten — and to zero when the clouds are off.

Measured consequence from the original: replacing a naive always-render scene with this made a
page-backdrop globe go from ~135 ms per frame under software rendering, sixty times a second, to
nothing at all.

### 2.11 Events and teardown

Listeners attached by the engine: `pointermove`, `pointerleave`, `pointerdown`, `pointerup`,
`webglcontextlost` on the canvas; `visibilitychange` on `document`. Pointer positions are
converted to container-local coordinates via `getBoundingClientRect()` before being handed to the
callbacks.

`webglcontextlost` calls `event.preventDefault()`, stops the loop, and reports
`new Error('[globe] the WebGL context was lost')` through `onError`.

`dispose()` must, in this order: mark disposed, stop the loop, cancel the rAF, remove every
listener, `controls.dispose()`, disconnect both observers, dispose every layer, `scene.clear()`,
`root.clear()`, `renderer.dispose()`, **`renderer.forceContextLoss()`**, `canvas.remove()`.

Without `forceContextLoss()` the browser keeps the context alive until GC, and a handful of route
changes is enough to hit the per-page context limit.

---

## 3. `PointerControls`

`src/core/controls/PointerControls.ts`. Owns drag, wheel and pinch. Talks to the engine through a
`ControlHost` interface rather than holding a reference to it.

### 3.1 Constants

```ts
const INERTIA_DECAY = 0.02;    // fraction of drag velocity surviving each second
const INERTIA_CUTOFF = 0.6;    // deg/s below which the glide is over
const ZOOM_DAMPING = 0.00001;  // fraction of remaining zoom distance covered per second
const WHEEL_SCALE = 0.0012;    // one notch (100 px) moves the camera ~12 %
const TILT_PER_PIXEL = 0.22;   // degrees of tilt per pixel of right-drag
const MAX_TILT_DRIFT_DEG = 22; // how far the centre may travel over one tilt drag
const ANCHOR_ITERATIONS = 4;
```

### 3.2 Drag modes

On `pointerdown`:

- `event.button === 2` **or** `event.button === 0 && event.shiftKey` → `tilt` (if `enableTilt`).
- `event.button === 0` → `rotate` (if `enableRotation`).
- Otherwise the press is ignored.

`pointermove` and `pointerup` are attached **to `window`**, only for the duration of the drag, so
a pointer that leaves the canvas keeps steering. Removed the instant the drag ends.

`contextmenu` is suppressed **on the canvas only**, and only while `enableTilt` is true. The host
app's own context menus are untouched — there is an e2e test for exactly this.

### 3.3 Rotation

Degrees of arc one pixel covers at the current distance:

```ts
private degreesPerPixel(): number {
  const { height } = this.host.getSize();
  const zoom = this.host.getPose().zoom;
  const capHalfAngle = Math.acos(Math.min(1, 1 / Math.max(zoom, 1.0001)));
  return (2 * capHalfAngle * RAD) / Math.max(height, 1);
}
```

Then, per move — note the sign, dragging right should carry the surface right, which means
looking further **west**:

```ts
const k = this.degreesPerPixel();
const deltaLng = -dx * k;
const deltaLat =  dy * k;
this.velocityLng = deltaLng * 60;   // per-second velocity for the glide
this.velocityLat = deltaLat * 60;
host.applyPose({ ...pose, lat: clampLat(pose.lat + deltaLat), lng: wrapLng(pose.lng + deltaLng) });
```

### 3.4 The tilt anchor

On pointer-down in tilt mode, record `tiltPivot` (the coordinate under the cursor),
`tiltAnchor` (the pixel), and `tiltOrigin` (the centre at that moment). Then, on every move:

```ts
private tiltBy(dy: number): void {
  const pose = this.host.getPose();
  const tilt = clamp(pose.tilt + dy * TILT_PER_PIXEL, TILT_MIN_DEG, TILT_MAX_DEG);
  this.host.applyPose({ ...pose, tilt });
  this.reanchor();
}

private reanchor(): void {
  if (!pivot || !anchor || !origin || this.anchorSpent) return;

  for (let i = 0; i < ANCHOR_ITERATIONS; i++) {
    const projected = this.host.latLngToScreen(pivot);
    if (projected && Math.abs(projected.x - anchor.x) < 0.5
                  && Math.abs(projected.y - anchor.y) < 0.5) return;

    const under = this.host.screenToLatLng(anchor.x, anchor.y);
    if (!under) { this.anchorSpent = true; return; }

    const before = this.host.getPose();
    this.host.swingPose(under, pivot);

    // Past the cap the anchor is asking for more than it is worth.
    if (arcBetween(origin, this.host.getPose()) > MAX_TILT_DRIFT_DEG) {
      this.host.applyPose(before);
      this.anchorSpent = true;
      return;
    }
  }
}
```

**The honest limit.** Pinning a point at a fixed pixel while the camera tilts *requires* the
centre to travel, and the demand accelerates: 28° of tilt already asks for 20° of centre movement,
and past that it runs away. So the drift is capped at 22° of arc per drag. Inside the cap the
anchor is exact; beyond it the anchor gives out (`anchorSpent`) and the tilt carries on alone —
a far better failure than the planet sliding out from under the cursor.

`arcBetween` is a haversine in degrees.

### 3.5 Wheel and pinch

The wheel listener is attached and removed by `syncWheelListener()`, called from the constructor
and from `setSettings`:

```ts
private syncWheelListener(): void {
  if (this.settings.enableZoom && !this.wheelAttached) {
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
    this.wheelAttached = true;
  } else if (!this.settings.enableZoom && this.wheelAttached) {
    this.element.removeEventListener('wheel', this.onWheel);
    this.wheelAttached = false;
  }
}
```

**Leaving it off is the mechanism** by which a page scrolls normally under a globe with
`enableZoom={false}`: there is nothing attached to swallow the event. Do not implement this as an
early `return` inside the handler.

```ts
private readonly onWheel = (event: WheelEvent): void => {
  event.preventDefault();                       // only ever claimed when zooming is on
  this.host.onInteractionStart();
  const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;   // line mode → pixels
  this.setZoom(this.host.getZoomTarget() * Math.exp(step * WHEEL_SCALE));
};
```

Pinch: track touch pointers in a `Map`; at two pointers, record the distance, end any drag, and on
each move scale `zoomTarget` by `previousDistance / currentDistance`.

### 3.6 Per-frame damping

```ts
update(deltaSeconds: number): boolean {
  // inertia glide after a rotate drag
  if (this.mode === 'none' && (|velocityLat| > CUTOFF || |velocityLng| > CUTOFF)) {
    const decay = Math.pow(INERTIA_DECAY, deltaSeconds);
    applyPose({ lat: clampLat(lat + velocityLat * dt), lng: wrapLng(lng + velocityLng * dt) });
    velocityLat *= decay; velocityLng *= decay;
  }

  // exponential ease of the actual zoom towards zoomTarget
  const target = host.getZoomTarget(), current = host.getPose().zoom;
  if (Math.abs(target - current) > 0.0005) {
    const t = 1 - Math.pow(ZOOM_DAMPING, deltaSeconds);
    applyPose({ ...pose, zoom: current + (target - current) * t });
  } else if (target !== current) {
    applyPose({ ...pose, zoom: target });   // snap the last sliver, so it settles exactly
  }
}
```

`cancelInertia()` zeroes both velocities, so a programmatic camera move is not fought by the
user's last flick.

---

## 4. `OverlayPositioner`

`src/core/OverlayPositioner.ts`. A registry of anchors, written to the DOM once per rendered
frame.

```ts
export type OverlayAnchor = {
  element: HTMLElement;
  lat: number;
  lng: number;
  /** Distance from the globe centre; markers sit a hair above the surface. */
  radius: number;
  /** Labels take part in collision resolution; markers do not. */
  collides: boolean;
  /** Lower wins when two labels overlap. */
  priority: number;
  /** Rotates the element so its axis follows the surface normal on screen. */
  alignToNormal: boolean;
};
```

`update(engine)`:

1. Clear the claimed-box list.
2. Sort anchors: `(a.collides ? a.priority : -1) - (b.collides ? b.priority : -1)`. Non-colliding
   anchors sort first (they never claim space); colliding ones are laid out lowest-priority-number
   first, so an important name claims its space before a minor one can overlap it.
3. For each anchor: `engine.projectInto(lat, lng, radius, projected)`.
   - Not visible → `style.visibility = 'hidden'`, continue.
   - `collides` and overlapping an already-claimed box → hidden, continue.
   - Otherwise write
     `transform: translate3d(<x>px, <y>px, 0)[ rotate(<a>rad)]` and `visibility: visible`.

`alignToNormal` projects a second point at `radius + 0.25` along the same normal; the on-screen
direction between them is "away from the globe", which is where a marker's head goes:

```ts
const angle = Math.atan2(normal.x - projected.x, -(normal.y - projected.y));
rotation = ` rotate(${angle.toFixed(3)}rad)`;
```

Collision test uses `offsetWidth`/`offsetHeight` centred on the projected point; a zero-sized
element (not yet laid out) never claims space and is never rejected.

**Why direct DOM writes.** Overlays are React's, but their positions are not: writing `transform`
straight to the node every frame keeps the globe off React's render path entirely. Elements are
rendered with `style={{ visibility: 'hidden' }}` initially so nothing flashes at 0,0 before the
first positioning pass.

---

## 5. Layers

Each layer owns a `Group` (or a `Mesh`), exposes small setters, and has a `dispose()`. Every
setter that changes appearance is followed by `engine.invalidate()` at the call site.

### 5.1 `VectorLayer` — shorelines and borders

Radial offsets, chosen so the depth buffer still hides the far side but nothing z-fights:

```ts
const SHORELINE_RADIUS = 1.0016;
const BORDER_RADIUS    = 1.0022;
```

Drawn with `LineSegments2` + `LineSegmentsGeometry` + `LineMaterial` from
`three/examples/jsm/lines/`, with **`worldUnits: false`** — that is what keeps a border the same
weight at 1.1 radii and at 4. Each mesh gets `frustumCulled = false` (the whole world is in one
geometry, so a bounding-sphere test can never reject it) and `raycast = () => undefined` (lines
are decoration; the sphere below owns hit-testing).

Per-style stroke table:

| Style | Shoreline | Border |
|---|---|---|
| `realistic` | `rgb(214,233,255)`, w 1.1, α 0.5 | `rgb(255,226,172)`, w 1.0, α 0.42 |
| `standard` | `rgb(72,104,130)`, w 1.0, α 0.6 | `rgb(126,116,100)`, w 0.9, α 0.55 |
| `cartoon` | `rgb(38,46,66)`, w 2.4, α 0.9 | `rgb(64,52,40)`, w 3.2, α 0.85 |
| `modern` | `rgb(122,236,255)`, w 0.9, **α 0** | `rgb(110,206,255)`, w 0.7, α 0.5 |

Grayscale substitutes `rgb(226,226,226)` / `rgb(196,196,196)`.

`modern` gives its coast opacity 0 deliberately: lit land meeting dark water directly is the whole
picture, and outlining it turns the style into a diagram of its own shorelines. Cartoon's border
is *heavier than its shoreline* because it has to sit over the edge of the fill beneath it.

### 5.2 `GraticuleLayer`

```ts
export const GRATICULE_STEP = 15;   // one hour of rotation, and the map convention
const RADIUS = 1.0012;              // just under the shorelines
const SAMPLE_DEG = 2;               // fine enough that a great circle reads as a curve
const PRINCIPAL_BOOST = 2.1;
```

Two meshes, not one: `minor` (width 0.7) and `principal` (width 1.1, opacity × 2.1). The equator
and prime meridian carry the grid, so they are drawn stronger — two meshes avoids a per-segment
attribute. Built once in the constructor, then only restyled.

Meridians run pole to pole; parallels stop short of the poles, where they would collapse to a
point.

`graticuleLabels()` is a pure function returning `{ key, lat, lng, text }[]`: meridians read off
the equator (`lat: 0`), parallels off Greenwich (`lng: 0`), plus one `0°` at the origin. Text is
`${Math.abs(v)}°${E|W|N|S}`.

Per-style colours: realistic `rgb(226,238,255)` α 0.22; standard `rgb(88,116,142)` α 0.26;
cartoon `rgb(38,46,66)` α 0.25; modern `rgb(122,236,255)` α 0.26.

### 5.3 `HighlightLayer` — the hovered country fill

```ts
const HIGHLIGHT_RADIUS = 1.0045;
```

`MeshBasicMaterial` with `transparent`, `depthWrite: false`, **`side: FrontSide`**,
`polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2`, `renderOrder = 2`.

Three things had to be got right, each of which was a visible bug:

- **0.0045 radii of clearance**, because at 0.0026 the sphere's own 384 × 192 facets poked
  through the fill.
- **2° subdivision, six levels deep**, because at 4° a flat triangle cut under the surface it was
  painted on.
- **`FrontSide`, not `DoubleSide`**, because a country wide enough to wrap the limb drew its far
  half through its near one.

Geometry is cached per country id as a whole `BufferGeometry` and the mesh's `geometry` is
swapped. **Do not swap a single attribute instead** — a replaced attribute leaves its GPU buffer
allocated until the geometry is disposed, so hovering across a map strands one buffer per country.

`setColor(value)` parses `rgb()`/`rgba()`/named colours by regex, splitting alpha into
`material.opacity`.

### 5.4 `PinLayer` — the instanced default marker

```ts
const HEAD_RADIUS = 0.017;
const HEAD_CENTRE = 0.058;      // how far the head's centre sits above the tip
const RADIAL_SEGMENTS = 14;
const PROFILE_SEGMENTS = 12;
const REFERENCE_DISTANCE = 1.6; // camera-to-SURFACE distance at which a pin is full size
const MIN_DISTANCE = 0.02;
const SHRINK = 0.6;
const MIN_SCREEN_SCALE = 0.5;
const MAX_SCREEN_SCALE = 1.15;

const BASE_COLOR     = 'rgb(233, 66, 76)';
const HOVER_COLOR    = 'rgb(255, 138, 132)';
const SELECTED_COLOR = 'rgb(63, 224, 197)';
```

**Shape.** One `LatheGeometry`, not a cone stuck under a sphere — one draw call and no crease at
the join. The profile is the tangent line from the tip to the head, then the head's own arc:

```ts
function pinProfile(): Vector2[] {
  const points: Vector2[] = [new Vector2(0, 0)];
  const grazing = Math.acos(HEAD_RADIUS / HEAD_CENTRE);   // where a line from the tip grazes the head
  for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
    const phi = grazing + (Math.PI - grazing) * (i / PROFILE_SEGMENTS);
    points.push(new Vector2(HEAD_RADIUS * Math.sin(phi), HEAD_CENTRE - HEAD_RADIUS * Math.cos(phi)));
  }
  return points;
}
```

Taking the tangent, rather than running the cone into the ball's side, is what gives the shape its
slim poured look.

**Material:** `MeshBasicMaterial({ toneMapped: false })` — unlit and out of the tone mapper's
reach, so a marker keeps its exact colour whether it stands in the sun or on the night side.

**Instances.** The tip sits at the origin and the body grows along `+y`, so the instance matrix
only has to point `+y` down the surface normal:

```ts
dummy.position.copy(v);
dummy.quaternion.setFromUnitVectors(UP, v.clone().normalize());
```

Bases are stored as `Matrix4[]`; only the uniform scale ever changes.
`instanceMatrix.setUsage(DynamicDrawUsage)`, `frustumCulled = false`,
`raycast = () => undefined` (hit-testing is screen-space, see §7.3).

**Sizing** — this one matters and got fixed twice:

```ts
setZoom(zoom: number): void {
  const ratio = Math.max(MIN_DISTANCE, zoom - 1) / REFERENCE_DISTANCE;
  const onScreen = clamp(Math.pow(ratio, SHRINK), MIN_SCREEN_SCALE, MAX_SCREEN_SCALE);
  const scale = ratio * onScreen;
  if (Math.abs(scale - this.lastScale) < 0.005) return;   // only rewrite when it matters
  ...
}
```

- `zoom - 1`, not `zoom`: distance to the **surface**, not to the centre. At a zoom of 1.1 the
  camera is a tenth of a radius from the ground, so a marker sized against the centre distance
  comes out roughly ten times too big.
- The `ratio` term alone holds screen size constant. The `Math.pow(ratio, SHRINK)` term
  deliberately gives back part of the approach: closing in shrinks the pin, so the map gains room
  as it gains detail, and the pin is still unmistakably a pin. Clamped at both ends so it can
  neither shrink out of sight at `minZoom` nor dwarf the globe at `maxZoom`.

**Clustering** is expressed as `setHiddenIndices(hidden: Uint8Array)` — a clustered pin collapses
to zero scale. That is one matrix write per pin that actually changed, far cheaper than rebuilding
the instanced mesh every time the camera nudges a cluster apart.

`setHovered(index)` / `setSelected(index)` repaint at most two instances via `setColorAt`.

### 5.5 `ConnectionLayer`

```ts
const SEGMENTS = 96;
const SURFACE_LIFT = 1.0026;   // just proud, so the globe still hides the far half
const ARCH_BASE = 0.06;        // every arch starts with this much lift
const FLOW_SPEED = 0.35;
const ANIMATED_FALLBACK: ConnectionLineStyle = 'dashed';

const DASH: Record<ConnectionLineStyle, { dashSize: number; gapSize: number } | null> = {
  solid:  null,
  dashed: { dashSize: 0.07,  gapSize: 0.045 },
  dotted: { dashSize: 0.004, gapSize: 0.028 },   // round caps turn a very short dash into a dot
};
```

**`resolveConnection(connection, defaults)` is the single place that decides what a link looks
like**, so the WebGL renderer and a consumer's `connectionComponent` can never disagree:

```ts
export function resolveConnection(connection, defaults): ResolvedConnection {
  const animated = connection.animated === true;
  const lineStyle = connection.lineStyle ?? defaults.lineStyle;
  return {
    type: connection.type ?? defaults.type,
    archHeight: connection.archHeight ?? defaults.archHeight,
    // A solid stroke has nothing to animate, so an animated one grows a pattern.
    lineStyle: animated && lineStyle === 'solid' ? ANIMATED_FALLBACK : lineStyle,
    width: connection.width ?? defaults.width,
    color: connection.color ?? defaults.color,
    animated,
  };
}
```

**`connectionPath(ends, type, archHeight)`** is also shared between the two renderers:

```ts
if (type === 'line') return greatCirclePath(from, to, SEGMENTS, () => SURFACE_LIFT);
// Short hops stay low, long hauls climb.
const height = ARCH_BASE + archHeight * greatCircleFraction(from, to);
return greatCirclePath(from, to, SEGMENTS, (t) => SURFACE_LIFT + height * Math.sin(Math.PI * t));
```

Both follow the great circle, so neither ever cuts through the globe's interior.

Each link becomes a `Line2` + `LineGeometry` + `LineMaterial` (`worldUnits: false`, opacity 0.95).
Dashed materials call `line.computeLineDistances()` — dashes are measured along the line, so the
distances have to exist first.

**Rebuild discipline:** each entry keeps a `signature` string of every resolved value plus both
endpoints. `setConnections` reuses an entry whose signature is unchanged, destroys and rebuilds
one that changed, and destroys anything no longer in the set.

`update(delta, reducedMotion)` advances `material.dashOffset = -elapsed * FLOW_SPEED` for animated
entries only, and returns whether anything moved. `get progress()` returns
`(elapsed * FLOW_SPEED) % 1` for the custom renderer.

### 5.6 `SurfaceLayer` and `LandLayer`

Covered in `03-RENDER-STYLES.md`, because they are where the four styles live. The engine-facing
surface is:

```ts
setStyle(style: SurfaceStyle, textures: SurfaceTextureSet, countries: readonly PreparedCountry[]): void
setZoom(zoom: number): boolean          // returns true when the land-mesh swap happened
update(delta: number, reducedMotion: boolean): boolean   // cloud drift + land arrival
own(...textures: (Texture | null)[]): void               // textures to dispose with the layer
get pickTarget(): Mesh
```

---

## 6. Geometry and math — `utils/`

### 6.1 `coordinates.ts`

The mapping the whole module is built on:

```
phi   = (90 - lat) * PI / 180        polar angle, 0 at the north pole
theta = (lng + 180) * PI / 180       azimuth, 0 at the antimeridian
x = -r * sin(phi) * cos(theta)
y =  r * cos(phi)
z =  r * sin(phi) * sin(theta)
```

This is **exactly `THREE.SphereGeometry`'s own vertex formula** with its default `phiStart` /
`thetaStart`, so an equirectangular texture whose left edge is -180° lands on the sphere
unmirrored. Get this wrong and every dataset is mirrored; the landmark tests in
`06-TESTING.md` are what pin it down.

Exports: `DEG`, `RAD`, `latLngToVector3(lat, lng, radius = 1, target = new Vector3())`,
`vector3ToLatLng(v)`, `latLngToUv(lat, lng)` (v runs bottom-to-top, matching three's convention),
`wrapLng(lng)`, `greatCircleAngle(a, b)` (haversine, so it stays accurate when close),
`greatCircleFraction(a, b)` (`angle / PI`; 0 coincident, 1 antipodal), `slerp(a, b, t, target)`,
`greatCirclePath(a, b, segments, lift)`, `fitBounds(points, minZoom, maxZoom)`.

`greatCirclePath` nudges `to.x += 1e-4` when the endpoints are antipodal (`dot < -0.999999`), so
the slerp has a defined plane.

`fitBounds` — used by the default cluster click:

```ts
// Spherical mean of the members, then the widest angular separation from it.
const wanted = Math.min(Math.PI / 2 - 0.02, widest * 1.6 + 0.06);
const zoom = 1 / Math.cos(wanted);     // inverse of "a camera d radii out sees a cap of acos(1/d)"
return { lat, lng, zoom: clamp(zoom, minZoom, maxZoom) };
```

### 6.2 `geo.ts`

`prepareCountries(collection)` indexes a country collection **once per load** into
`PreparedCountry[]`:

```ts
export type PreparedCountry = {
  feature: CountryFeature;
  id: string;
  name: string;
  polygons: { rings: Position[][]; bbox: Bbox }[];
  bbox: Bbox;                 // [west, south, east, north]
  labelPoint: LatLng;
  labelPriority: number;
};
```

Everything downstream reads this, never the raw GeoJSON. Polygons with fewer than 4 points in the
outer ring are dropped. `labelPoint` is the dataset's `labelLat`/`labelLng` where present,
otherwise the area-weighted centroid of the largest ring.

`normaliseProperties` fills in whatever a consumer-supplied collection left out, accepting
Natural Earth's raw names as fallbacks (`NAME`, `ADMIN`, `ISO_A3`, `ADM0_A3`).

**Hit-testing** — `findCountryAt(countries, lat, lng)`: linear over countries but bbox-rejected
first, so a miss costs ~242 comparisons and a hit costs one ring walk. `pointInRing` is even-odd
ray casting in lng/lat space; `pointInPolygon` requires inside the outer ring and outside every
hole. Called at most once per frame from the hover path.

**`triangulateCountry(country, radius)`** returns `{ positions, uvs, index }`:

1. Triangulate each polygon in **lng/lat space** with `ShapeUtils.triangulateShape(contour, holes)`,
   inside a `try/catch` — a self-intersecting ring is not worth failing a hover over.
2. **Drop antimeridian artefacts**: any triangle whose vertices span more than 180° of longitude.
   The triangulation runs on a cylinder cut open at 180°, so a ring with points on both sides can
   be handed a triangle spanning the whole map — which on the sphere is a sheet wrapped most of
   the way round it. No real triangle comes close to half the world wide.
3. **Subdivide** the longest edge while it exceeds `MAX_EDGE_DEG = 2`, six levels deep. Two
   degrees is roughly 220 km of chord, below the point where a flat triangle visibly cuts under
   the surface it is painted on.
4. Lift every vertex onto the sphere at `radius`; compute the uv from the same lng/lat
   (`(lng+180)/360`, `(lat+90)/180`) rather than recovering it in a shader — an `atan2` jumps from
   1 to 0 at the antimeridian and would smear a straddling triangle across the map.
5. **Wind every triangle outward**: compare the face normal with the outward direction and swap
   two corners if it disagrees. Natural Earth is not consistent about ring winding, and with
   back-face culling a wrong-wound country is hidden on the side facing the camera and shown on
   the side that is not — a crescent of one country's colour around the limb.
6. Keep it **indexed**. A coastline shares its vertices four or five ways; three loose vertices
   per triangle triples the per-frame vertex work for nothing.

`lineFeaturesToSegments(collection, radius)` flattens `LineString` / `MultiLineString` /
`Polygon` / `MultiPolygon` into the segment-pair `Float32Array` that `LineSegmentsGeometry` wants.

### 6.3 `clustering.ts`

```ts
export function clusterProjectedPins<TData>(
  projected: readonly ProjectedPin<TData>[],
  radiusPx: number,
): PinCluster<TData>[]
```

A uniform grid of `radiusPx` cells. Each pin only ever compares against the nine cells around it,
so this is **O(n)** with a small constant rather than O(n²) — which is what keeps 5 000 pins
inside a frame budget (measured under 8 ms). Input order decides which pin seeds a cluster, so the
result is deterministic.

Cell key packing: `(floor(x / r) + 32768) * 65536 + (floor(y / r) + 32768)`. Screen coordinates
stay well inside ±32 000 px, so this packs without collision.

Invisible pins are skipped entirely and never join a cluster.

**Cluster id must be stable across small camera moves**, or React tears down and rebuilds every
marker each time the camera drifts a pixel:

```ts
// smallest member id, plus the count
return members.length === 1 ? smallest : `cluster:${smallest}:${members.length}`;
```

Cluster position is the mean of its members' screen positions.

### 6.4 `countryColors.ts`

`assignCountryColors(countries, paletteSize): number[]` — a graph colouring, not a cycle.

**Adjacency:** two countries are neighbours when their outlines share a point, keyed on
coordinates rounded to 5 decimals. Natural Earth cuts countries from one topology, so a shared
border really is the same coordinates on both sides; the rounding guards against a float
surviving JSON differently on each side. Each country records each of its own points once, or
every ring becomes a self-neighbour and the join slows down.

**Welsh-Powell:** sort by descending neighbour count (ties by index, for determinism); for each,
take the free slot that has been used least so far. A country with no free slot takes the
least-used slot overall rather than none.

Cycling by index — which this replaced — lets the dataset's ordering decide, and that ordering is
close enough to alphabetical that neighbours regularly came out the same hue and read as one
country. A map on a sphere is planar, so four colours would suffice in principle; greedy is not
optimal, but with six it never has to reach for the fallback.

The property that matters, and the one the test asserts: **touching countries never share a slot.**

---

## 7. `Globe.tsx` — the React half

One file, ~865 lines. `GlobeCore<TData>` does the work; `Globe` wraps it in the error boundary.

### 7.1 Constants

```ts
const OVERLAY_INTERVAL_MS = 50;   // how often overlay SETS are recomputed (20 Hz)
const PIN_HIT_RADIUS = 18;        // screen distance within which a pointer counts as on a pin
const CLICK_SLOP = 4;             // pointer travel beyond this makes a press a drag
const CUSTOM_PATH_SAMPLES = 64;   // samples handed to a custom connection renderer
const MARKER_RADIUS = 1.02;       // radius the popup and cluster overlays anchor at
```

### 7.2 State, refs, and the props mirror

The first line of the component is `const p = resolveGlobeProps<TData>(props)`, and the second is
a `propsRef` that always holds the latest `p`. **Every callback handed to the engine reads through
`propsRef.current`**, never through a closure, so the engine is constructed exactly once and is
never torn down because a handler changed identity.

React state, deliberately small:

| State | Why it is state |
|---|---|
| `engineReady: boolean` | Gates every prop-sync effect. |
| `failed: boolean` | Renders the fallback instead of the container. |
| `pose: Required<CameraPose>` | Drives the controls' enabled/disabled state and the zoom-gated overlays. Updated from `onCameraChange` with an identity check so an unchanged pose does not re-render. |
| `overlay: OverlayState<TData>` | Clusters, loose DOM pins, custom-connection paths, flow progress. |
| `hoveredPinId`, `hoveredCountryId`, `tooltip`, `popupPlacement` | Small, changes rarely. |

Non-state refs: `projectedPinsRef`, `hiddenRef`, `lastOverlayRef`, `overlaySignatureRef`,
`pointerRef`, `hoveredCountryRef`, `homeRef`, `connectionDefaultsRef`, `scratchProjection`.

`home` is `useMemo(() => homePose(props.defaultCamera, props.defaultCenter), [...])`, mirrored into
`homeRef` so the imperative handle can read it without re-creating itself.

### 7.3 The frame callback

`onFrame` is called by the engine **only on frames it actually renders**:

```ts
positionerRef.current.update(engine);          // every rendered frame

const now = performance.now();
if (now - lastOverlayRef.current >= OVERLAY_INTERVAL_MS) {
  lastOverlayRef.current = now;
  recomputeOverlays(engine);                    // 20 Hz
}
```

**Overlay *positions* are written every rendered frame; overlay *sets* are recomputed at 20 Hz.**

`recomputeOverlays(engine)`:

1. Project every pin once into a reused `ProjectedPoint`, building `ProjectedPin[]`. Everything
   below reads these numbers — the pin is projected once, not once per consumer.
2. `clustering = enablePinClustering && zoom > clusterZoomThreshold`.
3. If clustering, run `clusterProjectedPins`, keep clusters of 2+, and mark their members in a
   `Uint8Array hidden`. Push it to `engine.pins.setHiddenIndices(hidden)`.
4. If `pinComponent` is given, collect the visible, unclustered pins into `loosePins`. With no
   override this array stays empty — the built-in marker is instanced geometry and never touches
   the overlay.
5. If `enableConnections && connectionComponent`, build each link's projected path: take
   `connectionPath(...)`, step it down to about 64 samples, and project each into a
   `ConnectionPathPoint` with its `visible` flag.
6. **Only call `setOverlay` when the set actually changed.** The signature is the cluster ids
   joined, a pipe, then the loose pin ids joined; custom connection paths force an update every
   pass because their geometry moves.

### 7.4 Hit-testing

**Pins** — screen space, against the projections computed above:

```ts
const pinAt = (x, y) => {
  let best = null, bestDistance = PIN_HIT_RADIUS ** 2;
  projectedPinsRef.current.forEach((entry, index) => {
    if (!entry.visible || hiddenRef.current[index]) return;
    const d = (entry.x - x) ** 2 + (entry.y - y) ** 2;
    if (d < bestDistance) { bestDistance = d; best = entry.pin; }
  });
  return best;
};
```

This is why every layer sets `raycast = () => undefined`: nothing in the scene answers a raycast
except the globe sphere itself.

**Countries** — geometric, as required, never colour picking:

```ts
const countryAt = (x, y) => {
  const point = engine.screenToLatLng(x, y);         // raycast to the unit sphere
  return point ? findCountryAt(countries, point.lat, point.lng) : null;
};
```

### 7.5 Pointer handling

`handlePointerMove(local, event)`:

1. Record the position. If `event.buttons !== 0` and travel from the press point exceeds
   `CLICK_SLOP`, mark the gesture a drag.
2. `pinAt` → if the hovered pin changed: set state, `engine.pins.setHovered(index)`, invalidate,
   fire `onPinHover`.
3. Country hover is skipped entirely unless `highlightCountryOnHover || showCountryNameOnHover ||
   onCountryHover` — no raycast, no point-in-polygon walk when nobody is listening.
4. **A pin under the cursor owns the hover; the country beneath it does not**
   (`const country = pin ? null : countryAt(...)`).
5. On a country change: update the ref and state, `engine.highlight.show(country)` when
   highlighting, invalidate, fire `onCountryHover(country?.feature ?? null)`.
6. Tooltip position is clamped so it cannot spill out of the canvas at an edge:
   `x = clamp(local.x + 14, 8, width - 8)`, `y = clamp(local.y + 16, 8, height - 8)`.

`handlePointerLeave` clears the pointer, the tooltip, the hovered pin and the hovered country,
firing both hover callbacks with `null`.

`handlePointerUp(local, event)` returns immediately if the gesture was a drag. Otherwise: a pin
under the cursor gets `onPinClick` and nothing else; failing that, `onCountryClick` gets the
country if there is one.

### 7.6 Engine lifecycle effect

```ts
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  let engine: GlobeEngine;
  try {
    engine = new GlobeEngine(container, { /* callbacks, all via refs */ });
  } catch (error) {
    handleError(error instanceof Error ? error : new Error('[globe] WebGL is unavailable'));
    setFailed(true);
    return;
  }
  engineRef.current = engine;
  engine.setCamera(homeRef.current, { animate: false });
  setEngineReady(true);

  return () => {
    engineRef.current = null;
    setEngineReady(false);
    positioner.clear();
    engine.dispose();
  };
}, []);   // once per mount, deliberately
```

The callbacks passed in read from two stable indirection refs (`frameRef`, `frameHandlersRef`)
that are reassigned on every render. That is what lets the handlers close over fresh state without
the engine being rebuilt.

### 7.7 Prop synchronisation effects

One effect per concern, each depending on `engineReady` plus its own props, each ending in
`invalidate()`.

| Effect deps | Calls |
|---|---|
| `minZoom, maxZoom` | `engine.setClamps` |
| `enableZoom, enableRotation, enableTilt` | `engine.setControlSettings` |
| `backgroundColor` | `engine.setBackground` |
| `reducedMotion` | `engine.setReducedMotion` |
| `renderStyle, colorScheme, showClouds, assets.*, countries` | `engine.surface.own(...)` then `engine.surface.setStyle(...)` |
| `assets.coastline` | `engine.vectors.setShorelines` |
| `assets.borders` | `engine.vectors.setBorders` |
| `showShorelines, showCountryBorders` (+ the datasets) | `engine.vectors.setVisibility` |
| `renderStyle, colorScheme` (+ the datasets) | `engine.vectors.setStyle` |
| `showGraticule, renderStyle, colorScheme` | `engine.graticule.setVisible` + `setStyle` |
| `countryHighlightColor` | `engine.highlight.setColor` |
| `pins, pinComponent` | `engine.pins.setPins`, `setVisible(pinComponent === undefined)`, `setZoom` |
| `connections, enableConnections, connectionComponent, connectionDefaults, pinIndex` | resolve endpoints → `engine.connections.setConnections` + `setVisible` |
| `props.camera` members | `engine.setCamera(controlled, { animate: true })` |

Two details in the connections effect:

- Endpoint resolution builds a `Map<string, ConnectionEnds>`; an unknown id is **warned about in
  dev and skipped**, naming both the connection and the missing pin id(s).
- `const drawn = enableConnections && !connectionComponent ? connections : []` — the built-in
  renderer draws in WebGL; an override draws its own SVG, so the WebGL set is emptied.

The controlled-camera effect depends on `controlled?.lat`, `controlled?.lng`, `controlled?.zoom`,
`controlled?.tilt` **and** the object itself, so both a member change and an identity change
animate.

### 7.8 The imperative handle

Built once with `useMemo(..., [])`, so its identity is stable; exposed both through
`useImperativeHandle(handleRef, ...)` and through `onReady`. `onReady` fires exactly once, guarded
by a `readyRef`.

### 7.9 Overlay rendering

`anchorRef(key, lat, lng, radius, options)` is a `useCallback` returning a ref callback that
registers or unregisters an anchor with the positioner. Every overlay element is wrapped in:

```tsx
<div
  ref={anchorRef(key, lat, lng, radius, { collides, priority, alignToNormal })}
  className="absolute left-0 top-0 will-change-transform"
  style={{ visibility: 'hidden' }}
>
  {/* the actual content, which owns its own translate */}
</div>
```

Anchor radii and priorities, which are what makes the label hierarchy read:

| Overlay | Radius | Collides | Priority |
|---|---|---|---|
| Graticule label | `1.004` | yes | `900` — behind every name; the grid yields first |
| Country label | `1.01` | yes | `country.labelPriority` (Natural Earth LABELRANK, 1 = most important) |
| Capital marker | `1.008` | yes | `100 + capital.labelPriority` |
| DOM pin (override) | `1.001` | no | — (`alignToNormal: true`) |
| Cluster marker | `MARKER_RADIUS` (1.02) | no | — |
| Pin popup | `MARKER_RADIUS` (1.02) | no | — |

Visibility gates computed in render:

```ts
const gridLabelsActive = p.showGraticule && p.showGraticuleLabels;
const labelsActive     = p.showCountryNames && countries !== null
                       && (p.countryNamesMinZoom <= 0 || pose.zoom <= p.countryNamesMinZoom);
const capitalsActive   = p.showCapitals && assets.capitals !== null
                       && pose.zoom <= p.capitalsMinZoom;
```

DOM pins receive `scale={Math.min(1.6, Math.max(0.55, pose.zoom / 2.6))}`.

Cluster click: `onClusterClick` if given, otherwise
`engine.setCamera(fitBounds(cluster.pins, minZoom, maxZoom), { animate: true })`.

Popup placement flips to `'bottom'` when the pin projects above y = 120, so a popup near the top
of the canvas stays inside it. The wrapper applies
`-translate-y-[calc(100%+0.5rem)] -translate-x-1/2` for `top`, `translate-y-2 -translate-x-1/2`
for `bottom`.

### 7.10 The container and stacking

```tsx
<div
  ref={containerRef}
  data-globe-root="true"
  className={`relative isolate overflow-hidden ${p.className ?? ''}`}
  style={{ width: p.width, height: p.height,
           background: p.backgroundColor === 'transparent' ? undefined : p.backgroundColor }}
>
  {/* canvas appended by the engine */}
  <div className="pointer-events-none absolute inset-0 isolate"> ...overlays... </div>
  <span className="sr-only" role="status" aria-live="polite">{hoveredCountryName}</span>
</div>
```

`isolate` creates a **local stacking context**. There are no portals to `document.body` and no
`z-index` that could climb over the host app's modals or toasts — that is the isolation contract.

`data-globe-root` is what the e2e suite selects on; keep it.

### 7.11 Accessibility

- Screen readers get the hovered country through a visually hidden `role="status"`
  `aria-live="polite"` region. The canvas itself says nothing.
- The built-in controls are real buttons with `aria-label`s, keyboard reachable, with
  `focus-visible` outlines and `disabled` states that report whether there is anything to do.
- The fallback is `role="presentation"` and wordless.
- Every animation the module runs is stopped by `prefers-reduced-motion`: camera flights become
  jumps, auto-rotate stops, cloud drift stops, connection flow stops.

---

## 8. Asset loading — `hooks/useGlobeAssets.ts`

```ts
export type AssetNeeds = {
  countries: boolean;
  elevation: boolean;   // the shaded styles read the height + land-cover rasters
  coastline: boolean;
  borders: boolean;
  capitals: boolean;
  textures: boolean;    // the realistic style's day/normal/specular/clouds
};
```

`Globe.tsx` computes the needs:

```ts
const wantsCountryData =
  p.showCountryNames || p.highlightCountryOnHover || p.showCountryNameOnHover ||
  p.renderStyle !== 'realistic' ||                    // every flat style paints from the polygons
  props.onCountryHover !== undefined || props.onCountryClick !== undefined;

const needs = useMemo(() => ({
  countries: wantsCountryData,
  coastline: p.showShorelines,
  borders:   p.showCountryBorders,
  capitals:  p.showCapitals,
  elevation: usesRasters(p.renderStyle),              // style !== 'realistic'
  textures:  p.renderStyle === 'realistic',
}), [...]);
```

**Datasets load on demand.** With every geography layer off and the realistic style selected, none
of the vectors are fetched at all.

The hook fetches each needed asset once, patches a single `LoadedAssets` state object as each
arrives, and reports failures through `onError` (held in a ref so the effect does not re-run when
the callback changes identity). An `alive` flag in the cleanup drops late arrivals and disposes
any texture that lands after unmount. A change of `sources` resets the state to empty first —
different sources mean a different globe entirely.

### 8.1 Progressive day texture

The 8192 x 4096 day map is thirty-four megapixels and takes real time to decode and upload. So:

```ts
let fullDayArrived = false;
if (sources.dayTexture === DEFAULT_ASSETS.dayTexture) {
  loadTexture(DEFAULT_ASSETS.dayPreview).then((texture) => {
    if (!alive || fullDayArrived) { texture.dispose(); return; }
    patch({ day: texture });
  });
}
// ...then the real ones, with `if (key === 'day') fullDayArrived = true;`
```

The globe wears a 2048 x 1024 preview first and swaps up when the full map is ready. **Skipped
when the consumer supplied their own `dayTexture`** — theirs is the one they asked for, and there
is no small version of it.

Measured in the original: the main-thread stall that came with the big texture disappeared, and an
unrelated hover-transition test elsewhere on the page went from failing one run in three to
passing four out of four, its runtime halving from 19 s to 9 s.

### 8.2 The cache — `assets/index.ts`

Two module-level maps keyed by URL: `imageCache` holding
`Promise<HTMLImageElement | ImageBitmap>`, and `jsonCache` holding `Promise<unknown>`. They live
for the life of the page, so remounting the globe on a route change costs no download and no
decode.

**What is deliberately *not* cached: `THREE.Texture` objects.** Each engine builds its own from
the shared image and disposes it on unmount, which frees the GPU handle without throwing away the
decode.

Decoding prefers `createImageBitmap` on a worker thread:

```ts
fetch(url).then(res => { if (!res.ok) throw new Error(...); return res.blob(); })
          .then(blob => createImageBitmap(blob, { imageOrientation: 'flipY' }))
```

with an `<img>` + `.decode()` fallback where `createImageBitmap` is missing.

**The `flipY` trap, which caused a real and very confusing bug.** A bitmap produced with
`imageOrientation: 'flipY'` is already the right way up for WebGL, so `loadTexture` sets
`texture.flipY = !(image instanceof ImageBitmap)`. But a **canvas** wants the opposite. When the
shaded styles read those same bitmaps back through a 2D canvas, they must flip them again on the
way in — otherwise the land cover for the Sahara is read from the southern ocean, and the physical
map comes out looking nothing like its reference.

A failed load must delete its own cache entry (`pending.catch(() => cache.delete(url))`) so a
retry is possible.

Exports: `DEFAULT_ASSETS`, `resolveAssets(assets)` (spread defaults, then every defined member of
the consumer's object), `loadDecodedImage(url)`, `loadTexture(url)`, `loadCountries(source)`,
`loadLines(url)`, `loadCapitals(source)`. The three dataset loaders accept either a URL string or
the parsed data directly.

---

## 9. Error handling

Three layers, all of which must be present:

1. **`GlobeErrorBoundary`** — the module's one class component, because React offers no hook that
   catches a render error. `getDerivedStateFromError` returns `{ failed: true }`;
   `componentDidCatch` calls `onError` and logs in dev. Renders `<GlobeFallback />` on failure.
2. **The engine constructor `try/catch`** in `GlobeCore`, for a browser with no WebGL.
3. **`onError` from the engine** — a lost context, or a dataset that would not load — which sets
   `failed` and swaps in the fallback.

**`GlobeFallback` carries no text.** The module owns no translations and imports none (that would
be a dependency on the app), so any message could only be hardcoded English. It renders a wordless
decorative glyph — a circle with two ellipses and an equator line, at 40 % opacity, using
`currentColor` — with `data-globe-fallback="true"` and `role="presentation"`, and reports through
`onError`, leaving the copy to the consumer.

---

## 10. Performance contract

State these in the README; they are what the design is for.

- One `requestAnimationFrame` loop, stopped outright when the canvas leaves the viewport
  (`IntersectionObserver`) or the tab is hidden.
- The loop draws only when something changed. A globe nobody is touching skips `renderer.render`
  and the overlay pass entirely; cloud drift steps at 10 Hz rather than per frame. Embedded as
  decoration with auto-rotate off, it costs almost nothing.
- Unmount disposes every geometry, material and texture, drops every listener, cancels the loop
  and forces the WebGL context loss. Twenty mount/unmount cycles leak nothing.
- Decoded images and parsed datasets are cached per URL for the life of the page.
- Datasets load on demand.
- Overlay positions are written straight to the DOM every frame; overlay sets are recomputed at
  20 Hz. Nothing that changes every frame goes through React state.
- Clustering is a uniform screen-space grid: O(n), under 8 ms for 5 000 pins.
- The default pin is one instanced mesh — one draw call regardless of count.
- Screen-space line width comes from `LineSegments2` / `LineMaterial` with `worldUnits: false`.
- Triangulating the world costs ~270 ms, runs on an idle callback, is shared between every globe
  on the page, and only happens once a camera is close enough to draw it.
