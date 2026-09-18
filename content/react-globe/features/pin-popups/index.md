---
description: Show a card for the pin under the pointer, from pin data or with your own component.
symbols:
  - Globe
  - PinPopupRenderProps
  - PinPopupPlacement
links:
  issues: https://github.com/kiralygyula92/react-globe/issues
  source: packages/globe/src/components/DefaultPinPopup.tsx
---

Popups put a pin's details next to it without leaving the globe: a name, a status, a link to more.

## Basics

Set `showPinPopup` and the built-in popup reads a title and subtitle from each pin's `data`.

::demo{src="./demo-basics.tsx" title="Built-in popups from pin data"}

### Title and subtitle

The built-in popup takes its title from `data.title`, `data.name` or `data.label` (falling back to
the pin's `id`), and its subtitle from `data.subtitle`, `data.description` or `data.caption`.

### Placement

The popup sits above its pin. When the pin is within 120 pixels of the top edge, the popup flips
below it so it stays inside the canvas. The side it chose arrives as `placement`.

### Staying open

The popup follows the hovered pin. Moving the pointer onto a popup keeps it open, so a custom popup
can hold buttons and links; `close` dismisses it.

## Customization

Pass `pinPopupComponent` to render any React content. Opt interactive content back into pointer
events: the overlay is `pointer-events: none` so drags reach the globe.

::demo{src="./demo-customization.tsx" title="A custom, interactive popup"}

The built-in popup is also themeable without replacing it; see
[Theming](/react-globe/customization/theming/) and [Overriding components](/react-globe/customization/overriding-components/).

## Limitations

- **Above or below only.** `PinPopupPlacement` includes `left` and `right`, but the globe only ever
  places a popup on the `top` or `bottom`.
- **Hover-driven.** A popup opens for the hovered pin. For touch-first screens, open your own panel
  from `onPinClick` instead of relying on hover.
- **One popup at a time.**
