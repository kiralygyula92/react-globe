/**
 * The server bundle: the same components, compiled for Node so `build.mjs` can render every
 * route to HTML. Nothing here reaches the browser.
 */

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: fileURLToPath(new URL('src/entry-server.tsx', import.meta.url)),
    outDir: 'dist-ssr',
    emptyOutDir: true,
    // Shiki ships every grammar; bundling them costs minutes and gains nothing at build time.
    rollupOptions: { external: [/^@shikijs\//, 'shiki', 'sharp'] },
  },
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
});
