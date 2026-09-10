/** The demo app. It consumes the library's built output, which keeps the library build honest. */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom', 'three'] },
  optimizeDeps: {
    // Left for Vite to discover mid-session, the dev server re-optimises and
    // answers whatever else is in flight with a 504.
    include: [
      'three',
      'three/examples/jsm/lines/Line2.js',
      'three/examples/jsm/lines/LineGeometry.js',
      'three/examples/jsm/lines/LineMaterial.js',
      'three/examples/jsm/lines/LineSegments2.js',
      'three/examples/jsm/lines/LineSegmentsGeometry.js',
    ],
  },
  server: { port: 5173, strictPort: true },
});
