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
      <svg className="chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
        ></path>
      </svg>
    </div>
  );
}
