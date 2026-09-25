# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the package adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-25

The first release, published as `@kiralygyula92/react-globe`.

### Added

- `<Globe />` and `<GlobeLazy />`: an interactive 3D Earth drawn with plain three.js.
- Four render styles (`standard`, `realistic`, `cartoon`, `modern`) and a grayscale scheme.
- Pins with clustering and popups, great-circle connections, country hover and click,
  capitals, country names and a graticule.
- Render overrides for pins, popups, clusters, connections and controls.
- `GlobeHandle` imperative API: camera control, fly-to, zoom, auto-rotate and projection.
- Localization: `locale` and `messages` props with built-in English, Romanian, German, Spanish,
  French and Hungarian UI strings and bundled country and capital names; `DEFAULT_GLOBE_MESSAGES`,
  `GLOBE_LOCALES` and `localizedName` exports.
- Theming through CSS custom properties, listed in the `GLOBE_THEME_TOKENS` export.
- Bundled public-domain textures (NASA) and vector data (Natural Earth).
- No dependencies: `three`, `react` and `react-dom` are peers, and the GeoJSON types the
  package reads are declared in the package itself.
- Rendering on demand: the globe draws only when something changed, and stops its loop while it is
  off screen or the tab is hidden.
- A lost WebGL context is waited out and picked back up when the browser restores it;
  only a loss that does not come back is reported through `onError`.
- Gestures end cleanly: a drag stops when its release is lost (the window losing focus, or the
  button let go outside it), and wheels that report scrolling in whole pages zoom by a matching
  amount.
- The canvas follows changes to the device pixel ratio, so page zoom or a move to another monitor
  keeps it sharp.
- Loaded images and datasets are shared while any globe is mounted and released a minute after the
  last one unmounts.
