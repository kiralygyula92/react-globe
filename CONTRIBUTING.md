# Contributing

Thanks for helping improve `@kiralygyula92/react-globe`! Bug reports, docs fixes and pull requests
are all welcome.

## Getting started

Requirements: Node 22.12+ and pnpm (run `corepack enable` to use the pinned version).

```sh
git clone https://github.com/kiralygyula92/react-globe.git
cd react-globe
pnpm install
pnpm build
pnpm dev
```

`pnpm dev` watches the library and serves the docs at http://localhost:4321/react-globe/. The
[root README](README.md#development) lists every command.

## Making a change

1. Open an issue first for larger changes, so we can agree on the API before you build it.
2. Create a branch from `main`.
3. Add or update tests: unit tests next to the source in `packages/globe/src` (`*.spec.ts`,
   Vitest + jsdom), end-to-end tests in `e2e`. Every behavior should be covered by at least one of
   them.
4. Run the checks:

   ```sh
   pnpm build && pnpm typecheck && pnpm test && pnpm docs:build && pnpm docs:demos && pnpm e2e
   ```

   The first Playwright run may ask for its browser: `pnpm exec playwright install chromium`.

5. Describe anything users will notice in the pull request. It goes into
   `packages/globe/CHANGELOG.md` when the next version is released (see
   [RELEASING.md](RELEASING.md)).
6. For public API changes, update the documentation (see below).
7. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, e.g.
   `feat(docs): mobile header and menu panel` or `fix(globe): recover from a lost WebGL context`.

## Documentation

The site's content lives in [`content/react-globe`](content/react-globe):

- **Reference pages are generated, never written by hand.** Document every export with JSDoc in
  `packages/globe/src`, then run `pnpm docs:reference`, which also updates the README's tables. Edit
  prose in `reference/*.strings.json`, never the `.schema.json` files.
- **Pages and their order are data.** Add a page to `nav.json` and `titles.json`, then create its
  Markdown file. Live demos are `demo-*.tsx` files next to their page.
- **URLs never break.** When a page moves, add its old URL to `redirects.json`, then run
  `pnpm docs:vercel` to regenerate the Vercel configuration.

After a docs change, `pnpm docs:build` and `pnpm docs:demos` must pass.

## Design principles

- **Everything is a prop:** `<Globe />` with no props renders a complete globe, and new behavior
  goes behind a prop, so upgrades never change existing globes.
- **No runtime dependencies** besides the peer dependencies `react`, `react-dom` and `three`.
- **Self-hosted assets:** nothing is fetched from a third-party host at runtime, and every bundled
  file is public domain.
- **Accessible:** the built-in controls are real buttons with localized labels and visible focus,
  and every animation stops under `prefers-reduced-motion`.
- **Localized:** new user-visible text is translated into every bundled language.
- **Themeable:** styling hooks are `--globe-*` CSS custom properties, and the compiled utilities
  carry the `rg:` prefix.

## Licensing of contributions

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
Only submit code and assets you wrote yourself or that are available under a compatible
permissive license. Note any third-party material in the pull request so it can be added to
`packages/globe/NOTICE`.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
