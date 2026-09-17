/**
 * Docs site build. The client bundle carries the parts of a page that react to the reader
 * and the live demos; `build.mjs` renders every route to HTML with the same components.
 *
 * Live demos are demo-*.tsx files colocated with their pages under content/; the React
 * plugin compiles them and `resolve.dedupe` makes their bare imports (react, react-globe,
 * three) resolve from this app, not from the content folder.
 */

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ROOT } from '../../scripts/docs/model.mjs';

const APP = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // The HTML is rendered by build.mjs, not served from an index.html.
  appType: 'custom',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    rollupOptions: { input: fileURLToPath(new URL('src/entry-client.tsx', import.meta.url)) },
    // three.js alone exceeds Vite's 500 kB warning; it loads lazily, only on pages with demos.
    chunkSizeWarningLimit: 900,
  },
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'three', 'react-globe'] },
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
  // Content, nav data and the shared model live outside the app.
  server: { fs: { allow: [APP, ROOT] } },
});
