# react-globe

A React component that renders a detailed, interactive 3D Earth with plain three.js, plus a
documentation site whose playground exercises every public prop live.

**Using the package?** See [packages/globe/README.md](packages/globe/README.md) for installation
and the full API.

## Layout

```
packages/globe/       the library, published to npm as `@kiralygyula92/react-globe`
apps/docs/            the documentation site (React, rendered to static files)
content/react-globe/  docs content and data: plugin.config.json, nav.json, titles.json, redirects.json, Markdown
e2e/                  Playwright suite driving the docs playground (Demos › Playground)
scripts/              globe-assets.mjs (bundled assets) and docs/ (content model, reference generator, demo check)
```

The docs site and its live demos consume the library's **built** output (`packages/globe/dist`),
which keeps the library build honest.

## Development

Requires Node 22.12+ and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
pnpm build          # library: JS bundle, compiled CSS, declarations, assets
pnpm dev            # build once, then watch the library and serve the docs at http://localhost:4321/react-globe/
pnpm test           # unit tests (Vitest + jsdom)
pnpm typecheck      # library, docs site and its demos
pnpm e2e            # Playwright suite (needs `pnpm build` first; starts the docs dev server itself)
pnpm assets         # re-download and regenerate packages/globe/src/assets/*
```

### Documentation site

```bash
pnpm docs:dev        # docs site at http://localhost:4321/react-globe/ (after pnpm build; no search in dev)
pnpm docs:reference  # regenerate the API reference and the README tables from packages/globe/src
pnpm docs:build      # check the reference is current, build apps/docs/dist + search index
pnpm docs:serve      # serve the build like a static host, honouring _redirects
pnpm docs:demos      # run every live demo of the build in Chromium and fail on errors
```

The site is React, rendered to static files: `vite build` bundles what the browser runs, a second
pass bundles the same components for Node, and `apps/docs/build.mjs` renders every page to HTML and
writes the Markdown twins, llms.txt, the sitemap, the feed and the social images. In the browser React
takes over the header and the right rail, and mounts the live demos; the rest is already painted.

Pages and their order are data: add a page to `content/react-globe/nav.json` and `titles.json`, then
create its Markdown file (the build names the file it expects if one is missing). Live demos are
`demo-*.tsx` files next to their page, used as `::demo{src="./demo-basics.tsx"}`. Reference pages are
generated — edit JSDoc in the library, or prose in `content/react-globe/reference/*.strings.json`, never
the `.schema.json` files. A moved page keeps its old URL through `redirects.json`. Set `DOCS_SITE_URL` to
the production origin when building for release.

The first Playwright run may ask for its browser: `npx playwright install chromium`. The suite serves
the playground page on port 4400; if that is taken, set `E2E_PORT` (for example `E2E_PORT=4499 pnpm e2e`):
Playwright otherwise reuses whatever server is already listening there.

## Deploying the docs

The site is a static build, hosted on Vercel. Import the repository and leave the rest to
`vercel.json`; no environment variable is required.

- **Root directory:** the repository root is the tidiest choice, but `apps/docs` works too — each
  carries its own `vercel.json`, and Vercel reads the one inside the root directory it is given.
- **Build:** `pnpm docs:build` (or `pnpm build` inside `apps/docs`). Either way the library is built
  first, because the docs import its built output.
- **URLs:** `trailingSlash` is on, `/` redirects to `/react-globe/`, and every moved URL 301s from
  `content/react-globe/redirects.json`.
- **Canonical origin:** taken from the project's production domain, so previews still declare the
  production URL. Set `DOCS_SITE_URL` to override it (a custom domain, say).
- **Insights:** turn on Web Analytics and Speed Insights in the Vercel project. The site reports
  page views and each reader's Core Web Vitals to the first-party `/_vercel/…` paths Vercel serves
  next to it, so there is no third-party request. The code ships only from a Vercel build — a local
  build leaves it out, because those paths exist nowhere else.

Both `vercel.json` files are generated: run `pnpm docs:vercel` after changing `redirects.json`.
`pnpm docs:build` fails if either is out of date, so the host and the build cannot disagree.

## Releasing

See [RELEASING.md](RELEASING.md). Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md), and
security problems go through [SECURITY.md](SECURITY.md), never a public issue.

## Data sources

All bundled imagery and vector data is public domain: NASA Blue Marble: Next Generation, NASA
Earth Observatory clouds, NASA Visible Earth GEBCO elevation, and
[Natural Earth](https://www.naturalearthdata.com/) vectors. Translated country and capital names come
from Natural Earth and [Wikidata](https://www.wikidata.org/) labels (CC0). The normal and specular
maps are derived from those by `scripts/globe-assets.mjs`.

## License

[MIT](LICENSE) © kiralygyula92. Third-party attributions are listed in
[`packages/globe/NOTICE`](packages/globe/NOTICE).
