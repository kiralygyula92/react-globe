---
description: Catch WebGL, loading and rendering failures in one callback while the globe falls back without breaking your page.
symbols:
  - Globe
  - GlobeHandle
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/components/GlobeErrorBoundary.tsx
---

## Basics

Pass `onError` to learn when the globe cannot run.

::demo{src="./demo-basics.tsx" title="A wrong dataset reported through onError"}

### What is reported

`onError` receives an `Error` when:

- WebGL is not available;
- the WebGL context is lost;
- a texture or dataset fails to load;
- rendering throws.

### Fallback

After an error the globe replaces its canvas with a wordless placeholder of the same size. Your page
keeps working: the error never propagates to the rest of your React tree.

### Ready

`onReady` fires once, with the [handle](/react-globe/camera-api/), after the globe has started.

### Development warnings

In development builds the globe also logs warnings for mistakes that do not stop it: `camera` and
`defaultCamera` passed together, `showCountryNameOnHover` combined with `showCountryNames`, and a
connection that refers to a missing pin.

## Customization

Show your own message and a way to retry; a new `key` remounts the globe.

::demo{src="./demo-customization.tsx" title="A custom error screen with retry"}

See [How to customize](/react-globe/customization/).

## Limitations

- **A failed globe stays failed.** It does not retry on its own; remount it, for example by changing
  its `key`.
- **Wordless fallback.** The built-in placeholder has no text; render your own message from `onError`
  if the reader needs one.
- **Warnings only in development.** Development warnings are not logged when `NODE_ENV` is `production`.
