/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** True in a Vercel build, where the analytics endpoints exist. Absent everywhere else. */
  readonly VITE_INSIGHTS?: boolean;
  /** The project's analytics base path, from Vercel at build time. */
  readonly VITE_VERCEL_OBSERVABILITY_BASEPATH?: string;
  /** Vercel's client settings for the analytics SDKs, as a JSON string. */
  readonly VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
