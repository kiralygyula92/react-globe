/** Version selector: every documented version, plus the Versions page. */
import type { HeaderProps } from '../lib/props';

export function VersionSelect({ versions, currentVersion, versionsHref }: Pick<HeaderProps, 'versions' | 'currentVersion' | 'versionsHref'>) {
  const selected = versions.find((v) => v.label === currentVersion)?.href ?? versionsHref;
  return (
    <div className="version-select">
      <label className="sr-only" htmlFor="docs-version">
        Documentation version
      </label>
      <select
        id="docs-version"
        defaultValue={selected}
        onChange={(event) => {
          const { value } = event.currentTarget;
          if (value && value !== window.location.pathname) window.location.href = value;
        }}
      >
        {versions.map((v) => (
          <option value={v.href} key={v.label}>
            {v.label}
          </option>
        ))}
        <option value={versionsHref}>All versions</option>
      </select>
      <svg className="caret" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path fill="currentColor" d="M7 10l5 5 5-5Z"></path>
      </svg>
    </div>
  );
}
