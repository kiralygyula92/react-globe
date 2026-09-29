# Releasing

Releases are published by the `Publish` workflow (`.github/workflows/publish.yml`) when a GitHub
release is published. The release tag must be `v` followed by the version in
`packages/globe/package.json`.

## One-time setup

1. **npm account:** the package is published under the `@kiralygyula92` scope, which needs an npm
   account (or organization) of that name. Check with `npm login` and `npm whoami`.
2. **Authentication:** the workflow uses npm trusted publishing. npm offers it only for a package
   that already exists, so publish the first version by hand (below), or add an `NPM_TOKEN`
   repository secret until trusted publishing is set up. Then, on npmjs.com, make this
   repository's `publish.yml` the package's trusted publisher; no secret is needed after that.
3. **Documentation site:** see [Deploying the docs](README.md#deploying-the-docs).

## Every release

1. Bump `version` in `packages/globe/package.json` and add a dated entry to
   `packages/globe/CHANGELOG.md`.
2. Commit, tag `vX.Y.Z` and push the tag.
3. Publish a GitHub release for the tag. The workflow checks that the tag matches the package
   version, runs the typecheck, the tests and the build, then publishes with provenance.

To publish by hand: `pnpm --filter @kiralygyula92/react-globe publish` (`prepublishOnly` runs the
checks and the build).

## Before a release, check

- CI is green on `main`.
- After `pnpm build`, `pnpm --filter @kiralygyula92/react-globe pack --dry-run` lists only
  `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `NOTICE` and `package.json`.
