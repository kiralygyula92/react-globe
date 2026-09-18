/**
 * Everything inside the docs header. Rendered with the page and taken over by the browser
 * so the version selector, search and theme switch work.
 *
 * On narrow screens the menu button opens the sidebar over the page. It is a label for the
 * checkbox the sidebar's CSS reads, so it works before the page is taken over; after, it is
 * also reachable from the keyboard, reports whether the menu is open, and Escape closes it.
 */
import { useEffect, useRef, useState } from 'react';
import type { HeaderProps } from '../lib/props';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
import { VersionSelect } from './VersionSelect';

const navToggle = (): HTMLInputElement | null => document.getElementById('nav-toggle') as HTMLInputElement | null;

export function Header({ name, repo, versions, currentVersion, versionsHref }: HeaderProps) {
  const menuButton = useRef<HTMLLabelElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    const toggle = navToggle();
    if (!toggle) return;
    toggle.checked = !toggle.checked;
    setMenuOpen(toggle.checked);
  };

  useEffect(() => {
    const toggle = navToggle();
    if (!toggle) return;
    const sync = () => setMenuOpen(toggle.checked);
    const close = () => {
      toggle.checked = false;
      sync();
    };
    // A page restored from the back/forward cache comes back as it was left: with the menu open.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // With the search dialog open, Escape is the dialog's.
      if (event.key !== 'Escape' || !toggle.checked || document.querySelector('dialog[open]')) return;
      close();
      menuButton.current?.focus();
    };
    sync();
    toggle.addEventListener('change', sync);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      toggle.removeEventListener('change', sync);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      <label
        className="icon-button nav-toggle-label"
        htmlFor="nav-toggle"
        role="button"
        tabIndex={0}
        aria-label="Navigation menu"
        aria-controls="docs-sidebar"
        aria-expanded={menuOpen}
        ref={menuButton}
        // Toggled here rather than by the label's own behaviour, which would move focus to the
        // hidden checkbox.
        onClick={(event) => {
          event.preventDefault();
          toggleMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleMenu();
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z"></path>
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
