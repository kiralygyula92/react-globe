---
pluginId: react-globe
title: Playground
description: One globe combining pins, clustering, popups, connections, country hover, controls, styles and locales.
date: 2026-09-15
---

A single screen that uses most of the package together: switch the render style and locale, hover
countries, click a hub to fly to it, and watch the linked routes.

::demo{src="./demo-scenario.tsx" title="A network of hubs" height="520"}

## What it uses

- [Pins](/react-globe/pins/) with [popups](/react-globe/pin-popups/); Lisbon and Porto merge into a
  [cluster](/react-globe/pin-clustering/) until you zoom in.
- [Connections](/react-globe/connections/) with an animated, a dotted and a coloured link.
- [Country hover](/react-globe/country-interaction/) with [localized names](/react-globe/localization/).
- [Controls](/react-globe/controls/), the [Camera API](/react-globe/camera-api/) and
  [Auto-rotate](/react-globe/auto-rotate/).
- All four [render styles](/react-globe/render-styles/).

## The full playground app

The repository also contains a development playground with a live control for every prop, used by the
end-to-end tests:

```bash
pnpm install
pnpm dev
```

It opens at `http://localhost:5173`.
