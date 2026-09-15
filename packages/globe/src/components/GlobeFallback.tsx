/**
 * The wordless placeholder shown while the globe loads or after it fails.
 *
 * Deliberately wordless: it shows before the locale's strings matter and after a
 * failure the consumer reports through `onError` in their own words, so it draws a
 * decorative glyph and leaves the copy to the consumer.
 */

export function GlobeFallback() {
  return (
    <div
      data-globe-fallback="true"
      role="presentation"
      className="rg:flex rg:h-full rg:w-full rg:items-center rg:justify-center"
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
