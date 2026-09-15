---
pluginId: react-globe
title: Installation
description: Add React Globe and three.js to a React project and import the stylesheet.
---

## Prerequisites

- React and React DOM **19** or later.
- three.js **0.170** or later (tested with 0.186).
- A bundler that copies files referenced with `new URL('./file', import.meta.url)` — Vite does this out
  of the box (tested with Vite 8).
- An ES module build: the package ships ES modules only.

See [Requirements & compatibility](/react-globe/getting-started/requirements/) for what is tested.

## Installation

### npm

```bash
npm install react-globe three
npm install --save-dev @types/three
```

### pnpm

```bash
pnpm add react-globe three
pnpm add --save-dev @types/three
```

### yarn

```bash
yarn add react-globe three
yarn add --dev @types/three
```

The package's own TypeScript declarations are included; `@types/three` is needed only if your code
imports three.js types.

## Minimal working example

Import the stylesheet once, at your app entry, and render the globe inside a container with a height.

```tsx
// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Globe } from 'react-globe';
import 'react-globe/globe.css';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Globe />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## Verification

Start your dev server. You should see a physical-map Earth with coastlines and borders filling the
page. Drag it to orbit, right-drag to tilt, and scroll to zoom.

## Troubleshooting

- **Nothing is drawn.** The container has no height; give it one, as in the example.
- **The dev server answers some requests with 504.** Pre-declare three's line modules for Vite; see
  [Vite](/react-globe/integrations/vite/).
- **Textures or datasets fail to load.** Your bundler did not copy the package's assets; serve
  `node_modules/react-globe/dist/assets` yourself and point the `assets` prop at them, as described in
  [Custom assets](/react-globe/custom-assets/).

## Next steps

- [Usage](/react-globe/getting-started/usage/) — add pins, a popup and controls.
- [All features](/react-globe/all-features/) — see everything the globe can do.
- [How to customize](/react-globe/customization/) — make it match your design.
