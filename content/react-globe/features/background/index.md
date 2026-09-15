---
pluginId: react-globe
capabilityId: background
title: Background
description: Paint the space behind the globe with any CSS colour or a design token, or leave it transparent.
group: Display & layout
plan: free
symbols:
  - Globe
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/Globe.tsx
---

## Basics

Set `backgroundColor` to any CSS colour to fill the canvas behind the globe.

::demo{src="./demo-basics.tsx" title="A solid background"}

### Transparent

The default, `transparent`, lets whatever is behind the container show through, so the globe sits on
your page's own background, gradient or image.

### Colour formats

Named colours, hex, `rgb()` and `hsl()` are accepted.

### Design tokens

A `var(--token)` value is resolved against the globe's container, so the background can follow your
design system. `var(--token, fallback)` uses the fallback when the token is unset; an unset token
without a fallback is treated as `transparent`.

```tsx
<div style={{ '--surface': 'rgb(248 250 252)' } as React.CSSProperties}>
  <Globe backgroundColor="var(--surface)" />
</div>
```

## Customization

Switch the background between tokens to follow a light and dark theme.

::demo{src="./demo-customization.tsx" title="Switching between two surface tokens"}

For the colours of everything drawn over the globe, see [Theming](/react-globe/customization/theming/).

## Limitations

- **Tokens are read when the prop changes.** Changing the value of the custom property alone does not
  repaint the globe. Point `backgroundColor` at a different token, or change the prop, when your theme
  switches.
- **No partial transparency.** Any colour other than `transparent` is painted fully opaque; an alpha
  channel is ignored. Use `transparent` and style the container to layer the globe over other content.
