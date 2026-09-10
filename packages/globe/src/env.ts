/**
 * Build-time development flag.
 *
 * The library build defines `__DEV__` as `process.env.NODE_ENV !== "production"`,
 * which every mainstream bundler replaces, so a consumer's minifier can drop the
 * warning branches. Where nothing replaces it (native ESM with no bundler, or the
 * unit tests without a define) the reference throws and the flag reads false.
 */

declare const __DEV__: boolean;

function detectDev(): boolean {
  try {
    return __DEV__;
  } catch {
    return false;
  }
}

export const isDev: boolean = detectDev();

/** A development-only `console.warn`. */
export function devWarn(message: string): void {
  if (isDev) console.warn(message);
}
