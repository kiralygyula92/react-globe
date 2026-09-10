/**
 * Library build.
 *
 * Asset URLs: `src/assets/index.ts` writes `new URL('./file', import.meta.url)`,
 * which is right for the source tree. For the published build they must point at
 * `./assets/file` next to `dist/index.js`, stay a literal `new URL(...)` that the
 * consumer's bundler can recognise and emit, and must not be inlined by this
 * build. The plugin below does exactly that and copies the files under stable,
 * unhashed names.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ASSETS_DIR = fileURLToPath(new URL('./src/assets/', import.meta.url));
const ASSET_MODULE = /[\\/]src[\\/]assets[\\/]index\.ts$/;
const ASSET_URL = /new URL\(\s*(['"])\.\/([\w.-]+)\1\s*,\s*import\.meta\.url\s*\)/g;
const PLACEHOLDER = /__GLOBE_ASSET__\((['"])([\w.-]+)\1\)/g;

function globeAssets(): Plugin {
  const files = new Set<string>();
  return {
    name: 'globe-assets',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!ASSET_MODULE.test(id)) return null;
      const rewritten = code.replace(ASSET_URL, (_match, _quote, file: string) => {
        files.add(file);
        return `__GLOBE_ASSET__("${file}")`;
      });
      return { code: rewritten, map: null };
    },
    renderChunk(code) {
      if (!code.includes('__GLOBE_ASSET__')) return null;
      return {
        code: code.replace(PLACEHOLDER, (_match, _quote, file: string) => `new URL("./assets/${file}", import.meta.url)`),
        map: null,
      };
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: `assets/${file}`, source: readFileSync(`${ASSETS_DIR}${file}`) });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), globeAssets()],
  define: { __DEV__: 'process.env.NODE_ENV !== "production"' },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: {
      // Without /^three\// the line modules get bundled and the consumer ends up
      // with two copies of three's core classes.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'three', /^three\//],
      output: {
        // Stable names, not hashed: the consumer's bundler will hash them if it wants.
        assetFileNames: 'assets/[name][extname]',
        chunkFileNames: '[name].js',
      },
    },
    target: 'es2022',
    sourcemap: true,
    minify: false,
    // `pnpm build` cleans; watch mode must not wipe the stylesheet and types.
    emptyOutDir: false,
    copyPublicDir: false,
  },
});
