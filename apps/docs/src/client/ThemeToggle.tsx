/**
 * Light / dark theme switch. The choice is stored per browser and applied before first paint
 * by the inline script in the document head; without JavaScript the system preference applies
 * and the button stays hidden.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'react-globe-docs-theme';

const current = (): 'light' | 'dark' => {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeToggle() {
  // Until the browser takes over there is nothing to toggle, so the button is hidden.
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    setTheme(current());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setTheme(current());
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const toggle = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
    setTheme(next);
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={theme === null ? 'Toggle dark theme' : dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === null ? undefined : dark}
      hidden={theme === null}
      onClick={toggle}
    >
      <svg className="icon-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M20.7 14.9A8.5 8.5 0 0 1 9.1 3.3a.8.8 0 0 0-1-1A10 10 0 1 0 21.7 16a.8.8 0 0 0-1-1.1Z"></path>
      </svg>
      <svg
        className="icon-sun"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
      </svg>
    </button>
  );
}
