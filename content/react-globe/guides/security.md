---
description: What React Globe loads, what it renders from your data, and how to run it under a Content Security Policy.
date: 2026-09-15
---

## Network requests

The globe requests only its own assets — textures and datasets from the package, served from your site —
and the URLs you pass in `assets`. It contacts no third-party service. Asset URLs are loaded with
`fetch`, or with an image element where `createImageBitmap` is not available.

## Content Security Policy

Allow the origin that serves the globe's assets in `connect-src` and `img-src`. With the assets on your
own origin:

```http
Content-Security-Policy: default-src 'self'; connect-src 'self'; img-src 'self'
```

If you host textures or datasets elsewhere, add that origin to both directives and send
`Access-Control-Allow-Origin` from it.

The globe does not use `eval`, `new Function` or HTML injection.

## Rendering your data

Text from pin data, country and capital names is rendered by React as text, never as HTML, in the built-in
popup, labels and tooltip. Inside your own override components, the usual React rules apply: avoid
`dangerouslySetInnerHTML` with untrusted data.

## Dependencies

At runtime the package depends only on its peers — React, React DOM and three.js. Keep them up to date
with your package manager's audit tools.

## Reporting a vulnerability

Report security problems privately to the maintainer, not in a public issue; see
[Support](/react-globe/getting-started/support/).
