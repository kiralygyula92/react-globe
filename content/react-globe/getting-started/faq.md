---
pluginId: react-globe
title: FAQ
description: Answers to the questions that come up most when adding React Globe to an application.
date: 2026-09-15
---

## Why is nothing drawn?

The globe fills its container, and a container without a height collapses to zero. Give the container
a height, or pass `height` to the globe. See [Globe](/react-globe/globe/).

## Does the globe fetch anything from the internet?

No. Textures and datasets ship with the package and load from your own site. The only requests the
globe makes are for those files, or for the URLs you pass in `assets`.

## Can I use the bundled imagery and data in a commercial product?

Yes. Every bundled file is in the public domain — NASA imagery and Natural Earth vectors, with
translated names from Natural Earth and Wikidata (CC0). The code is MIT-licensed. See
[Bundled data](/react-globe/customization/bundled-data/).

## Does it work with server-side rendering?

Server-side rendering has not been tested. The globe needs WebGL, so render it on the client only;
[Lazy loading](/react-globe/lazy-loading/) shows how to load it on demand.

## How large is the download?

The bundled textures and datasets total about 7 MB, but they load on demand: layers that are off are
not fetched, and the `realistic` style's textures are not fetched for the other styles. three.js is the
largest code dependency; keep it out of your main bundle with a dynamic import.

## Can I show several globes on one page?

Yes. Each globe uses its own WebGL context, and browsers limit how many can be live at once, so mount
only the globes that are on screen. Loaded datasets are shared between globes.

## Why does the page not scroll when I swipe over the globe on a phone?

The canvas claims touch gestures so it can rotate and pinch. See the limitations on
[Gestures](/react-globe/gestures/).

## How do I translate the controls?

Set `locale`, or pass `messages`. See [Localization](/react-globe/localization/).
