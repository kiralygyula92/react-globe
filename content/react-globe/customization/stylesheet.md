---
pluginId: react-globe
title: Stylesheet
description: How the package stylesheet is built, why it cannot clash with your CSS, and where to import it.
date: 2026-09-15
---

## Import it once

```tsx
import 'react-globe/globe.css';
```

Import it at your application entry, alongside your own global styles. Without it, the built-in
controls, labels, tooltip, cluster markers and popup lose their layout.

## What it contains

The stylesheet is compiled [Tailwind CSS](https://tailwindcss.com/) containing only the utilities the
built-in components use:

- **No reset.** Tailwind's preflight is left out, so your base styles for `body`, headings, buttons and
  lists are untouched.
- **Prefixed utilities.** Every class is prefixed `rg:`, so it cannot collide with your own Tailwind
  classes or any other framework.
- **Prefixed theme variables.** Tailwind's variables are emitted as `--rg-*`.

## Using Tailwind in your own app

Your Tailwind setup and the globe's stylesheet are independent; no configuration is needed. Your
utilities work inside override components as usual.

## Styling the built-in elements

Prefer [theme tokens](/react-globe/customization/theming/) to overriding the `rg:` classes: the class
names are an implementation detail and may change between versions, while the tokens are part of the
documented API.
