---
pluginId: react-globe
title: Requirements & compatibility
description: The React, three.js, bundler and browser versions React Globe declares and the ones it is tested with.
---

## Prerequisites

| | Declared | Tested with |
|---|---|---|
| `react`, `react-dom` | `>= 19` (peer) | 19.3 |
| `three` | `>= 0.170` (peer) | 0.186 |
| Module format | ES modules only | — |
| Bundler | Must copy `new URL('./file', import.meta.url)` assets | Vite 8 |
| Browser | WebGL | Chromium, through the Playwright end-to-end suite |
| TypeScript | Declarations included | 5.9 |

"Tested with" means the repository's builds and tests run against that version. Versions inside the
declared range that are not listed have not been tested; please report problems.

## Installation

The peer dependencies are installed alongside the package:

```bash
npm install react-globe three react react-dom
```

## Minimal working example

Check the versions your project resolved:

```bash
npm ls react react-dom three react-globe
```

## Verification

The output should show `react` and `react-dom` at 19 or later and `three` at 0.170 or later, each
installed once. More than one copy of `three` can break rendering; deduplicate it in your package
manager or bundler.

## Not yet verified

- Bundlers other than Vite, such as webpack or Rollup used directly.
- Server-side rendering frameworks. Render the globe on the client only.
- Browsers other than Chromium, and mobile browsers.

These are tracked on the [Roadmap](/react-globe/discover-more/roadmap/).

## Next steps

- [Installation](/react-globe/getting-started/installation/)
- [Vite](/react-globe/integrations/vite/)
- [Support](/react-globe/getting-started/support/)
