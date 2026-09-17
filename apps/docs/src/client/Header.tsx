/**
 * Everything inside the docs header. Rendered with the page and taken over by the browser
 * so the version selector, search and theme switch work.
 */
import type { HeaderProps } from '../lib/props';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { VersionSelect } from './VersionSelect';

export function Header({ name, repo, versions, currentVersion, versionsHref }: HeaderProps) {
  return (
    <>
      <label className="icon-button nav-toggle-label" htmlFor="nav-toggle" aria-label="Open navigation">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z"
          ></path>
        </svg>
      </label>
      <a className="brand" href="/">
        {name}
      </a>
      <VersionSelect versions={versions} currentVersion={currentVersion} versionsHref={versionsHref} />
      <span className="spacer"></span>
      <Search />
      <a className="icon-button" href={repo} aria-label="GitHub repository">
        <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          ></path>
        </svg>
      </a>
      <ThemeToggle />
    </>
  );
}
