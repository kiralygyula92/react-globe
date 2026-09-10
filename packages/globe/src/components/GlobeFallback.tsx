/**
 * The wordless placeholder shown while the globe loads or after it fails.
 *
 * The module owns no translations, so any message could only be hardcoded
 * English; it draws a decorative glyph and reports through `onError`, leaving the
 * copy to the consumer.
 */

export function GlobeFallback() {
  return (
    <div
      data-globe-fallback="true"
      role="presentation"
      className="wg:flex wg:h-full wg:w-full wg:items-center wg:justify-center"
    >
      <svg
        viewBox="0 0 48 48"
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="20" />
        <ellipse cx="24" cy="24" rx="8" ry="20" />
        <ellipse cx="24" cy="24" rx="15" ry="20" />
        <line x1="4" y1="24" x2="44" y2="24" />
      </svg>
    </div>
  );
}
