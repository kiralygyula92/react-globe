# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the package adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

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
- Bundled public-domain textures (NASA) and vector data (Natural Earth).
