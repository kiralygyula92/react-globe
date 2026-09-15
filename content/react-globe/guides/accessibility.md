---
pluginId: react-globe
title: Accessibility
description: What React Globe does for accessibility out of the box, and what your application needs to add.
date: 2026-09-15
---

## Built in

- **Real buttons.** The built-in controls are `<button>` elements with accessible names in the current
  locale, disabled states and visible focus outlines.
- **Announced hover.** The name of the hovered country is announced through a visually hidden
  `role="status"` live region.
- **Named clusters.** Cluster markers are buttons whose accessible name states the pin count, with plural
  rules for the locale.
- **Language.** The container's `lang` attribute follows `locale`, so assistive technology pronounces
  place names correctly.
- **Reduced motion.** Camera flights, auto-rotation, cloud drift and connection flow all stop while the
  reader's system asks for reduced motion; flights jump straight to their destination.

## Your responsibility

- **Keyboard access.** The canvas cannot be operated with a keyboard. Turn on `showControls` or provide
  your own controls, and make sure every action available by clicking a pin or country is also available
  elsewhere, such as a list next to the globe.
- **A text alternative.** Describe what the globe shows for readers who cannot see it — a caption, a
  heading, or a table of the same data.
- **Custom components.** Overrides you provide must carry their own accessible names, focus styles and
  pointer events; use the `messages` prop where one is provided.
- **Colour contrast.** Check contrast when you change theme tokens, especially label colours over the
  render style you chose.
- **Touch scrolling.** A globe claims touch gestures; leave scrollable space around it on small screens.

## Checking your screen

Test with a screen reader and keyboard only, and run an automated checker on the page. Automated checks
cannot see inside the WebGL canvas, so your text alternative is what they and screen-reader users rely
on.
