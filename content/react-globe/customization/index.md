---
pluginId: react-globe
title: How to customize
description: The ways to change how the globe looks, from a single prop to replacing components, in order of effort.
date: 2026-09-15
---

Start with the lightest option that does the job; each step down gives more control for more code.

## 1. Props

Most visual choices are props: `renderStyle`, `colorScheme`, `backgroundColor`,
`countryHighlightColor`, the `connection*` defaults, and which layers are shown. See
[Render styles](/react-globe/render-styles/) and [Background](/react-globe/background/).

```tsx
<Globe renderStyle="modern" backgroundColor="rgb(2 6 23)" connectionColor="rgb(56 189 248)" />
```

## 2. Theme tokens

The built-in labels, tooltip, popup, cluster marker and controls read CSS custom properties. Set them on
any ancestor to match your design system without writing components. See
[Theming](/react-globe/customization/theming/).

```css
.map-panel {
  --globe-color-cluster: rgb(16 185 129);
  --globe-surface-card: rgb(15 23 42);
  --globe-text-primary: white;
}
```

## 3. Component overrides

Replace a pin marker, popup, cluster marker, connection or the controls with your own React
component. See [Overriding components](/react-globe/customization/overriding-components/).

```tsx
<Globe pins={pins} pinComponent={MyMarker} pinPopupComponent={MyCard} />
```

## 4. Assets

Swap the bundled imagery, countries or capitals for your own files or data. See
[Custom assets](/react-globe/custom-assets/).

## Where the stylesheet fits

`react-globe/globe.css` styles the built-in elements with prefixed utilities and no global reset, so it
coexists with your own CSS. See [Stylesheet](/react-globe/customization/stylesheet/), and
[Recipes](/react-globe/customization/recipes/) for complete combinations.
