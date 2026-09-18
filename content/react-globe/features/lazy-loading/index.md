---
description: Load the globe and three.js only when it renders, with a placeholder in the meantime.
symbols:
  - GlobeLazy
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/Globe.lazy.tsx
---

## Basics

Render `GlobeLazy` instead of `Globe`; it takes the same props and shows a placeholder while it loads.

::demo{src="./demo-basics.tsx" title="GlobeLazy with a placeholder"}

### Placeholder

The placeholder is a wordless globe outline, so it needs no translation. It fills its parent element,
so give the parent the size the globe will have.

### Ref

`GlobeLazy` forwards `ref` to the globe's handle once it has loaded.

## Keep three.js out of your main bundle

Because the package entry also exports `Globe`, importing `GlobeLazy` alone does not split three.js
into its own chunk. Make your own import dynamic:

```tsx
import { lazy, Suspense } from 'react';

const WorldMap = lazy(() => import('./WorldMap'));

export function Page() {
  return (
    <Suspense fallback={null}>
      <WorldMap />
    </Suspense>
  );
}
```

`WorldMap.tsx` imports `Globe` normally; your bundler puts it and three.js in a separate chunk.

## Customization

Mount the globe only when the reader asks for it.

::demo{src="./demo-customization.tsx" title="Load on demand"}

See [Performance](/react-globe/guides/performance/) for what loads when, and
[How to customize](/react-globe/customization/) for styling the globe once it has loaded.

## Limitations

- **No automatic code splitting.** `GlobeLazy` defers rendering, but importing anything from the package
  statically includes `Globe` in that chunk; use a dynamic import as shown above.
- **Fixed placeholder.** The placeholder cannot be replaced; wrap `Globe` in your own `Suspense` with
  your own fallback for a custom one.
