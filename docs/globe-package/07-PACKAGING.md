# 07 — Packaging for npm

The folder is self-contained. Five things need real decisions when it leaves the app, and they are
the five below. Get them wrong and the package works in a Vite/Tailwind app and nowhere else.

---

## 1. Styling — the Tailwind problem

**The situation:** every class name in the module is a Tailwind v4 utility. In the original that
was free, because the host app ran Tailwind. A published package cannot assume that.

Three options. Pick one and document it prominently in the README.

### Option A — ship compiled CSS (recommended)

Run the Tailwind CLI over the package sources at build time and emit a single stylesheet the
consumer imports once:

```jsonc
// packages/globe/package.json
"scripts": {
  "build:css": "tailwindcss -i ./src/styles.css -o ./dist/globe.css --content './src/**/*.tsx'",
  "build": "pnpm build:css && vite build && tsc -p tsconfig.build.json"
}
```

```tsx
import { Globe } from '@yourscope/react-globe';
import '@yourscope/react-globe/globe.css';
```

Pros: works everywhere, zero consumer config. Cons: a stylesheet to import, and a small risk of
utility-class collisions with the host app's own Tailwind.

**Mitigate the collision risk** by prefixing the package's utilities (Tailwind v4:
`@import "tailwindcss" prefix(wg);`) so `flex` becomes `wg:flex`. Do this once, at the start —
retrofitting it across ~40 files is tedious.

### Option B — require Tailwind in the consuming app

Document that consumers must add the package to their Tailwind content globs:

```css
@import "tailwindcss";
@source "../node_modules/@yourscope/react-globe/dist";
```

Pros: nothing to ship, the host's design system applies. Cons: only works for Tailwind v4 apps,
and it is a config step people will get wrong.

### Option C — hand-written CSS

Replace every class string with plain CSS in a scoped stylesheet. Most portable, most work,
and the option that most changes the code you are porting.

**Nothing else about the module cares which you choose** — the classes are all presentational.

---

## 2. Design tokens

Components reference `var(--wg-*, fallback)`. **Every one has a literal fallback**, so they
already render correctly with no tokens defined. The full set:

| Token | Fallback | Used by |
|---|---|---|
| `--wg-paper-000` | `rgb(255 255 255)` | capital marker ring, cluster border |
| `--wg-paper-100` | `rgb(247 251 253)` | country label, capital name, graticule label |
| `--wg-aurora-500` | `rgb(63 224 197)` | capital dot, control focus ring |
| `--wg-marigold-500` | `rgb(255 181 61)` | cluster fill |
| `--wg-marigold-200` | `rgb(255 226 172)` | cluster hover fill |
| `--wg-ink-900` | `rgb(17 37 58)` | cluster text |
| `--wg-space-800` | `rgb(11 16 38)` | country tooltip background |
| `--wg-surface-card` | `rgb(255 255 255)` / `rgb(15 18 38/0.72)` | popup background, control background |
| `--wg-surface-sunken` | `rgb(35 42 78/0.9)` | control hover |
| `--wg-text-primary` | `rgb(17 37 58)` | popup title, control icon |
| `--wg-text-secondary` | `rgb(60 90 114)` | popup subtitle |
| `--wg-border-strong` | `rgb(0 0 0/0.12)` / `rgb(255 255 255/0.3)` | popup border, control border |
| `--wg-r-sm` / `--wg-r-md` | `0.375rem` / `0.625rem` | tooltip, popup radii |
| `--wg-shadow-md` / `--wg-shadow-lg` | see source | cluster, tooltip, popup |

**Decide whether to rename them.** `--wg-` is the original app's prefix; for a public package
something like `--globe-` reads better. Whatever you pick, the fallback must stay, and the README
must list the set so a consumer can theme it without overriding components.

`backgroundColor="var(--anything)"` is separate and already works: the engine resolves it against
the container through `getComputedStyle`.

---

## 3. Asset URLs — the `?url` problem

`assets/index.ts` uses Vite's `?url` imports. **That syntax is Vite-only.** A consumer on webpack,
Rollup, Next.js or plain ESM gets a build error.

Three ways out, in order of how well they travel:

### 3.1 Emit the assets and resolve at runtime (recommended)

Ship the asset files in `dist/assets/` untouched, and resolve them relative to the module:

```ts
const base = new URL('./assets/', import.meta.url).href;
export const DEFAULT_ASSETS = {
  dayTexture: `${base}earth-day-8192.jpg`,
  // …
} as const;
```

`import.meta.url` works in every modern bundler and in native ESM. Consumers using a bundler that
does not copy the files need a plugin or a copy step — document it, and offer 3.3 as the escape
hatch.

### 3.2 Publish the assets separately

A companion package (`@yourscope/react-globe-assets`) or a CDN base URL, with a
`assetsBaseUrl` prop. Keeps the main package small (9 MB is a lot for npm), at the cost of the
"nothing is fetched from a third-party host" guarantee.

### 3.3 Make the URLs required props

Export `DEFAULT_ASSETS` as a *type* only and require the consumer to pass `assets`. Most portable,
worst first-run experience — `<Globe />` with zero props stops working, which breaks a headline
requirement.

**Recommendation: 3.1, with the asset files copied into `dist` by the build, plus a documented
`assets` prop for anyone who wants to host them elsewhere.** Consider also publishing a
`"sideEffects": false`-safe secondary entry so a consumer who only wants the realistic style is
not forced to bundle 3 MB of GeoJSON.

---

## 4. `import.meta.env.DEV`

Used to gate dev warnings and `console.error`. That is Vite-specific too. Replace with a build-time
constant:

```ts
// src/env.ts
declare const __DEV__: boolean;
export const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
```

and define it in the library build (`define: { __DEV__: 'process.env.NODE_ENV !== "production"' }`),
so a consumer's minifier can drop the warning branches entirely.

Every `if (import.meta.env.DEV)` in the source becomes `if (isDev)`.

---

## 5. Peer dependencies

`react`, `react-dom`, `three`. Nothing else at runtime. `@types/geojson` and `@types/three` are
devDependencies — but if your public `.d.ts` references `geojson` types (it does:
`CountryFeature` is a `Feature<...>`), then **`@types/geojson` must be a real `dependency`**, or
consumers get "cannot find module 'geojson'" when they typecheck. Same reasoning applies to
`@types/three` only if three's types leak into your public surface; they should not — keep every
three type internal.

---

## 6. `package.json`

```jsonc
{
  "name": "@yourscope/react-globe",
  "version": "1.0.0",
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./globe.css": "./dist/globe.css",
    "./assets/*": "./dist/assets/*"
  },
  "peerDependencies": {
    "react": ">=19",
    "react-dom": ">=19",
    "three": ">=0.170"
  },
  "dependencies": {
    "@types/geojson": "^7946.0.16"
  }
}
```

No `main`/`module` fields — `exports` only, ESM only. If CJS consumers matter, add a `require`
condition and a second Rollup output, but three.js itself is ESM-first so this is rarely worth it.

## 7. `vite.config.ts` — library mode

```ts
export default defineConfig({
  plugins: [react()],
  define: { __DEV__: 'process.env.NODE_ENV !== "production"' },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'three', /^three\//],
      output: { assetFileNames: 'assets/[name][extname]' },   // stable names, not hashed
    },
    target: 'es2022',
    sourcemap: true,
  },
});
```

**`/^three\//` in `external` matters** — without it the `three/examples/jsm/lines/*` imports get
bundled and the consumer ends up with two copies of three's core classes, which fails in
confusing ways (`instanceof` checks stop matching).

**Do not hash the asset filenames** in the library build. The consumer's bundler will hash them
again if it wants to; stable names are what makes the `import.meta.url` resolution in §3.1 and the
`./assets/*` export path predictable.

Types: `tsc -p tsconfig.build.json --emitDeclarationOnly --declaration --outDir dist`.

---

## 8. What to leave behind

- `playground/` — developer tooling; it becomes `apps/demo/`.
- `scripts/globe-assets.mjs` — keep it in the repo, exclude it from `files`.
- The e2e suite — repo, not package.

---

## 9. Pre-publish checklist

- [ ] `npm pack` and inspect the tarball: `dist/index.js`, `dist/index.d.ts`, `dist/globe.css`,
      `dist/assets/*` (10 files), and nothing else.
- [ ] Install the tarball into a **fresh, non-Vite** app (a Next.js app router page and a plain
      Rollup app are the two worth trying) and render `<Globe />`.
- [ ] Confirm three.js is not duplicated: `npm ls three` shows one copy.
- [ ] Confirm the `.d.ts` resolves with `skipLibCheck: false` in the consumer.
- [ ] Confirm `<Globe />` with zero props renders.
- [ ] Confirm the licence attribution (Solar System Scope, CC BY 4.0) is in the published README.
- [ ] Check the published size. 9 MB of assets is large for npm; if that is unacceptable, take
      option 3.2 before the first release rather than after.
