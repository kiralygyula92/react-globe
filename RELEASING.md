# Releasing

A release is a version bump merged to `main` plus a `v*` tag on that commit. Pushing the tag runs
the `Release` workflow (`.github/workflows/release.yml`), which tests and builds the library and
stages it on npm through [trusted publishing](https://docs.npmjs.com/trusted-publishers). No npm
token exists anywhere, and every version carries
[provenance](https://docs.npmjs.com/generating-provenance-statements). A staged version goes live
only after a maintainer approves it on npmjs.com with a passkey.

## First publish

npm only connects a trusted publisher to a package that already exists, so `1.0.0` is published
once by hand (`npm login`, then `npm publish` from `packages/globe`) and tagged `v1.0.0`. Every
later version is staged from a tag.

## How it is wired

- **npm:** `@kingtech/react-globe` trusts this repository's `release.yml`, run in the `npm`
  environment, for staged publishing only, and its publishing access requires two-factor
  authentication and disallows tokens. Check with `npm trust list @kingtech/react-globe`.
- **GitHub:** the `npm` environment accepts deployments from `v*` tags only, and a ruleset stops
  anyone but an admin from creating, moving or deleting those tags. Changes reach `main` only
  through pull requests that pass the CI `build` job. Only GitHub-made actions may run, and the
  default workflow token is read-only. The workflow also refuses a tag that isn't on `main` or
  doesn't match the version in `packages/globe/package.json`.
- **Private vulnerability reporting** is on; [SECURITY.md](SECURITY.md) sends reporters there.

## Every release

1. Check that CI is green on `main`.
2. Bump the version on a release branch. From `packages/globe`:

   ```sh
   git switch main && git pull --ff-only
   npm version <patch|minor|major> --no-git-tag-version
   git switch -c release/vX.Y.Z
   ```

3. Add a dated `## [X.Y.Z] - YYYY-MM-DD` entry to `packages/globe/CHANGELOG.md`, commit as
   `release: vX.Y.Z`, open a pull request and merge it once CI passes.
4. Tag the merged commit on `main` and push the tag:

   ```sh
   git switch main && git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. When **Actions → Release** finishes, approve the staged version on npmjs.com (_Staged
   Packages_), then create the GitHub release from the changelog section:
   `gh release create vX.Y.Z --title vX.Y.Z --notes-file <section.md>`.

Tags can't be moved and npm never accepts a version number twice, so if a release run fails, fix
the cause and release the next patch version.

## Documentation site

The site is hosted on Vercel and deploys from `main`; see
[Deploying the docs](README.md#deploying-the-docs).

## Before a release, check

- CI is green on `main`.
- After `pnpm build`, `pnpm --filter @kingtech/react-globe pack --dry-run` lists only `dist/`,
  `README.md`, `CHANGELOG.md`, `LICENSE`, `NOTICE` and `package.json`.
