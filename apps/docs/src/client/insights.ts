/**
 * Vercel Web Analytics (page views) and Speed Insights (what the Core Web Vitals actually
 * are for real readers). Both send to first-party paths Vercel serves next to the site
 * (`/_vercel/…`), so there is no third-party request and nothing to accept.
 *
 * Loaded only from a Vercel build — see `__INSIGHTS__` in vite.config.ts. Anywhere else
 * those paths do not exist, and asking for them would be a 404 in every reader's console.
 */

import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

inject();
injectSpeedInsights();
