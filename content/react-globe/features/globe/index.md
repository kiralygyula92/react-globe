---
description: One component that renders an interactive 3D Earth with sensible defaults, sized by its container.
symbols:
  - Globe
  - GlobeProps
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/Globe.tsx
---

`Globe` is the whole package in one component: every layer, interaction and override is a prop on
it. Start here, then turn on what your screen needs.

## Basics

`<Globe />` with no props draws a physical-map Earth with coastlines and borders that you can drag,
tilt and zoom.

::demo{src="./demo-basics.tsx" title="A globe with no props"}

### Size

The globe fills its container, so the container must have a size. `width` and `height` default to
`100%`; pass numbers (pixels) or any CSS length to size the globe itself.

```tsx
<div style={{ height: 480 }}>
  <Globe />
</div>

<Globe width={320} height={320} />
```

### Stylesheet

Import `@kiralygyula92/react-globe/globe.css` once, at your app entry. The built-in controls, labels,
clusters and popups are styled by it.

```tsx
import '@kiralygyula92/react-globe/globe.css';
```

:::warning
A container without a height collapses to zero and nothing is drawn.

```tsx
// Wrong: the parent has no height, so 100% resolves to 0
<section>
  <Globe />
</section>
```
:::

## Customization

`className` is appended to the container's classes and `width` / `height` go on its inline style, so
the globe fits any layout. Every visual element can also be restyled or replaced.

::demo{src="./demo-customization.tsx" title="A fixed-size modern globe on a gradient"}

Start with [How to customize](/react-globe/customization/) for the options in order of effort.

## Limitations

- **One WebGL context per globe.** Browsers cap the number of live WebGL contexts per page (commonly
  around 16). Mount globes that are on screen, or use [lazy loading](/react-globe/lazy-loading/) for
  globes further down a page.
- **Client-side rendering only.** The globe needs a browser with WebGL; it has not been tested with
  server-side rendering. Render it only on the client in a framework that renders on the server.
