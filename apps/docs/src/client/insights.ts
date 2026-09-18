/**
 * Vercel Web Analytics (page views) and Speed Insights (what the Core Web Vitals actually
 * are for real readers). Both report to first-party paths Vercel serves next to the site,
 * so there is no third-party request and nothing to accept.
 *
 * Where those paths are is Vercel's to say: a project gets its own base path, handed to
 * the build (see vite.config.ts) and passed on here. Without it the SDKs would fall back
 * to /_vercel/insights, which a current project does not serve.
 *
 * Loaded only from a Vercel build — see VITE_INSIGHTS in vite.config.ts. Anywhere else
 * those paths do not exist, and asking for them would be a 404 in every reader's console.
 */

import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

const basePath = import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH || undefined;
const clientConfig = import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG || undefined;

inject({ basePath }, clientConfig);
injectSpeedInsights({ basePath }, clientConfig);
