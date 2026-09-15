---
pluginId: react-globe
title: Vite
description: Use React Globe in a Vite application, including the dev-server setting that avoids reloads.
date: 2026-09-15
---

React Globe is developed and tested with Vite 8, and its bundled assets work without extra
configuration.

## Install

```bash
npm install react-globe three
```

Import the stylesheet in your entry file:

```tsx
import 'react-globe/globe.css';
```

## Pre-bundle three.js's line modules

The package imports three.js modules from `three/examples/jsm/lines/`. When Vite discovers them in the
middle of a dev session it re-optimises dependencies and answers in-flight requests with a 504. Declare
them up front:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/lines/Line2.js',
      'three/examples/jsm/lines/LineGeometry.js',
      'three/examples/jsm/lines/LineMaterial.js',
      'three/examples/jsm/lines/LineSegments2.js',
      'three/examples/jsm/lines/LineSegmentsGeometry.js',
    ],
  },
});
```

This affects the dev server only; production builds need nothing extra.

## Assets

The package references its textures and datasets with `new URL('./assets/…', import.meta.url)`. Vite
copies each file into your build output and rewrites the URL, so no copying or public-folder setup is
needed.

## One copy of three.js

In a monorepo, make sure the application and the package resolve the same `three`:

```ts
resolve: { dedupe: ['react', 'react-dom', 'three'] },
```
