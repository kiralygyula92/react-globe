---
description: Replace the bundled imagery, countries and capitals with your own files or data.
symbols:
  - Globe
  - GlobeAssets
  - CountryCollection
  - CountryFeature
  - CountryProperties
  - CapitalRecord
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/assets/index.ts
---

Every texture and dataset ships with the package, but you can swap them: your own regions instead of
countries, your own sites instead of capitals, or imagery you host.

## Basics

Pass `assets` with a URL or the parsed data for anything you want to replace.

::demo{src="./demo-basics.tsx" title="Two hand-drawn regions as the country layer"}

### Countries

`countriesGeoJson` takes a URL to, or the parsed, GeoJSON FeatureCollection of polygons. Hover,
click, labels and the flat styles all read it. A raw Natural Earth countries file works as is: `NAME`,
`ADMIN`, `ISO_A3`, `ADM0_A3`, `LABEL_X`, `LABEL_Y` and `LABELRANK` are accepted, and its `NAME_XX`
columns become localized names.

### Capitals

`capitalsDataset` takes a URL to, or the parsed, array of `CapitalRecord`.

### Textures

`dayTexture`, `normalMap`, `specularMap` and `cloudsTexture` take URLs to equirectangular images for
the `realistic` style.

```tsx
<Globe renderStyle="realistic" assets={{ dayTexture: '/textures/earth-night.jpg' }} />
```

### Serving the bundled files yourself

The bundled files resolve with `new URL('./assets/…', import.meta.url)`, which bundlers such as Vite
copy into your build. If yours does not, copy `node_modules/@kiralygyula92/react-globe/dist/assets`
to a folder you serve and point `assets` at the files. They are also exported as
`@kiralygyula92/react-globe/assets/*`.

## Customization

A capitals dataset is a convenient way to show your own labelled points with collision-aware names.

::demo{src="./demo-customization.tsx" title="Your own sites as the capitals layer"}

See [How to customize](/react-globe/customization/) and [Bundled data](/react-globe/customization/bundled-data/)
for what ships by default.

## Limitations

- **Not every layer is replaceable.** Coastlines, borders, elevation and the land-cover raster the
  `standard`, `cartoon` and `modern` styles read always come from the bundled files. Turn
  `showShorelines` and `showCountryBorders` off when they do not match your own countries.
- **Cached while in use.** Loaded images and datasets are cached per URL while a globe is on the page
  (and for a minute after), so replacing a file on the server behind an unchanged URL is not picked up
  by a globe that is showing it. Version the URL instead.
- **Your data, your licence.** The bundled files are public domain; files you supply carry their own
  terms.
