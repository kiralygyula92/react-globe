/**
 * Docs site build. The client bundle carries the parts of a page that react to the reader
 * and the live demos; `build.mjs` renders every route to HTML with the same components.
 *
 * Live demos are demo-*.tsx files colocated with their pages under content/; the React
 * plugin compiles them and `resolve.dedupe` makes their bare imports (react, three,
 * @kiralygyula92/react-globe) resolve from this app, not from the content folder.
 */

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ROOT } from '../../scripts/docs/model.mjs';

const APP = fileURLToPath(new URL('.', import.meta.url));

/**
 * Analytics ship only from a Vercel build: the endpoints they report to are served by
 * Vercel alongside the site, and asking for them anywhere else is a 404 in the console.
 * False here removes the code from the bundle entirely.
 */
const INSIGHTS = Boolean(process.env.VERCEL);

/**
 * Where Vercel serves this project's analytics endpoints, and the client settings it hands
 * the SDK. Vercel sets both at build time, and a project with Web Analytics on is served
 * from its own path rather than the old fixed /_vercel/insights — which is why the SDKs
 * have to be told. The VITE_ spelling appears when Vercel knows the app is Vite; the plain
 * one is the system variable it comes from, so either is accepted.
 */
const OBSERVABILITY = {
  basePath: process.env.VITE_VERCEL_OBSERVABILITY_BASEPATH ?? process.env.VERCEL_OBSERVABILITY_BASEPATH ?? '',
  clientConfig: process.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG ?? process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG ?? '',
};
if (INSIGHTS) {
  // Shows in the Vercel build log: the first thing to read when analytics stay empty.
  console.log(
    `[docs] insights: base path ${OBSERVABILITY.basePath || '(none from Vercel; using /_vercel)'}, client config ${OBSERVABILITY.clientConfig ? 'present' : 'absent'}`,
  );
}

export default defineConfig({
  // Read through import.meta.env, which is an object in development: there the key is
  // simply absent, which is the answer we want anyway.
  define: {
    'import.meta.env.VITE_INSIGHTS': JSON.stringify(INSIGHTS),
    'import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH': JSON.stringify(OBSERVABILITY.basePath),
    'import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG': JSON.stringify(OBSERVABILITY.clientConfig),
  },
  // The HTML is rendered by build.mjs, not served from an index.html.
  appType: 'custom',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    rollupOptions: {
      input: fileURLToPath(new URL('src/entry-client.tsx', import.meta.url)),
      // The lazy chunk holding the globe and three.js would be named after the library's dist
      // folder; only its file name changes here, never how modules are split.
      output: { chunkFileNames: (chunk) => `assets/${chunk.name === 'dist' ? 'globe' : '[name]'}-[hash].js` },
    },
    // three.js alone exceeds Vite's 500 kB warning; it loads lazily, only on pages with demos.
    chunkSizeWarningLimit: 900,
  },
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'three', '@kiralygyula92/react-globe'] },
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
