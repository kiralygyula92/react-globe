/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** True in a Vercel build, where the analytics endpoints exist. Absent everywhere else. */
  readonly VITE_INSIGHTS?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
