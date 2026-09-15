# Flow walkthroughs

PPDS §9, clicked through in Chromium against `apps/docs/dist` on 2026-09-15.

## F1 Evaluate

The marketing landing, capability showcase, feature matrix and pricing do not exist (EXCEPTIONS E-01, E-02); the docs part of the path is walked.

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Docs overview | `/react-globe/` | OK |
| 2 | Click “All features” | `/react-globe/all-features/` | OK |
| 3 | Click “Connections” | `/react-globe/connections/` | OK |
| 4 | Capability page shows a live demo | `/react-globe/connections/` | OK |
| 5 | Click “Installation” | `/react-globe/getting-started/installation/` | OK |

**Completable.**

## F2 Adopt

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Docs overview | `/react-globe/` | OK |
| 2 | Click “Installation” | `/react-globe/getting-started/installation/` | OK |
| 3 | Click “Usage” | `/react-globe/getting-started/usage/` | OK |
| 4 | Click “Pins” | `/react-globe/pins/` | OK |
| 5 | First capability shows a live demo | `/react-globe/pins/` | OK |

**Completable.**

## F3 Implement

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Any page | `/react-globe/` | OK |
| 2 | Search “clustering”, open “Pin clustering” | `/react-globe/pin-clustering/` | OK |
| 3 | Demo with its source | `/react-globe/pin-clustering/` | OK |
| 4 | Click “ClusterRenderProps” | `/react-globe/api/cluster-render-props/` | OK |
| 5 | Generated reference table | `/react-globe/api/cluster-render-props/` | OK |
| 6 | Back to the capability page | `/react-globe/pin-clustering/` | OK |

**Completable.**

## F4 Customise

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Capability page | `/react-globe/country-names/` | OK |
| 2 | Click “Theming” | `/react-globe/customization/theming/` | OK |
| 3 | Click “GLOBE_THEME_TOKENS reference” | `/react-globe/api/globe-theme-tokens/` | OK |
| 4 | Every token with its fallbacks | `/react-globe/api/globe-theme-tokens/` | OK |

**Completable.**

## F5 Upgrade

There is no migration page yet: 1.0.0 is the first release (EXCEPTIONS E-06).

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Any docs page | `/react-globe/camera/` | OK |
| 2 | Version selector | `/react-globe/camera/` | OK |
| 3 | Click “All versions” | `/react-globe/getting-started/versions/` | OK |
| 4 | Click “Changelog” | `/react-globe/discover-more/changelog/` | OK |
| 5 | Changelog with its RSS feed | `/react-globe/discover-more/changelog/` | OK |

**Completable.**

## F6 Convert

Not applicable. Untiered: no paid tier, badge, pricing or licence activation exists (EXCEPTIONS E-01).

## F7 Support

| # | Step | Page | Result |
|---|---|---|---|
| 1 | Any docs page | `/react-globe/gestures/` | OK |
| 2 | Click “Support” | `/react-globe/getting-started/support/` | OK |
| 3 | Free channel: the issue tracker | `/react-globe/getting-started/support/` | OK — 3 link(s) |

**Completable.**

## F8 Agent

| # | Step | Page | Result |
|---|---|---|---|
| 1 | llms.txt | `—` | OK — HTTP 200 |
| 2 | First listed Markdown twin | `—` | OK — /react-globe/index.md → HTTP 200 |

**Completable.**

