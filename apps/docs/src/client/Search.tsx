/**
 * Full-text search over the static Pagefind index built after the site build. The header shows a
 * compact trigger; it (or `/`) opens a modal dialog with the field and results. Arrow keys move
 * through results; Escape or the close button dismisses. A development server has no index,
 * which the dialog says instead of failing silently.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type PagefindResult = { data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }> };
type Pagefind = { search: (term: string) => Promise<{ results: PagefindResult[] }> };
type Hit = { url: string; title: string; excerpt: string };

const MAX_RESULTS = 8;
const NO_INDEX = 'Search is available in the built site: run pnpm docs:build, then pnpm docs:serve.';

let pagefind: Promise<Pagefind | null> | null = null;

const load = (): Promise<Pagefind | null> => {
  const path = '/pagefind/pagefind.js';
  pagefind ??= import(/* @vite-ignore */ path).then(
    (module: Pagefind) => module,
    () => null,
  );
  return pagefind;
};

export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const query = useRef(0);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const open = useCallback(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    input.current?.select();
    void load();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const run = async (term: string) => {
    const id = ++query.current;
    if (!term.trim()) {
      setHits(null);
      setMessage(null);
      return;
    }
    const engine = await load();
    if (id !== query.current) return;
    if (!engine) {
      setHits(null);
      setMessage(NO_INDEX);
      return;
    }
    const { results } = await engine.search(term);
    const items = await Promise.all(results.slice(0, MAX_RESULTS).map((r) => r.data()));
    if (id !== query.current) return;
    if (items.length === 0) {
      setHits(null);
      setMessage(`No results for “${term}”.`);
      return;
    }
    setMessage(null);
    setHits(items.map((item) => ({ url: item.url, title: item.meta.title ?? item.url, excerpt: item.excerpt })));
  };

  // Debounced, so a fast typist runs one search instead of one per keystroke.
  const timer = useRef(0);
  const onInput = (value: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void run(value), 120);
  };

  const links = () => [...(panel.current?.querySelectorAll<HTMLAnchorElement>('.search-result') ?? [])];

  const onResultsKeyDown = (event: React.KeyboardEvent) => {
    const all = links();
    const index = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      all[Math.min(all.length - 1, index + 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index <= 0) input.current?.focus();
      else all[index - 1]?.focus();
    }
  };

  return (
    <div className="search">
      <button type="button" className="search-trigger" aria-haspopup="dialog" aria-keyshortcuts="/" onClick={open}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65a.75.75 0 1 1-1.06 1.06l-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          ></path>
        </svg>
        <span className="search-trigger-label">Search</span>
        <kbd aria-hidden="true">/</kbd>
      </button>

      <dialog
        className="search-dialog"
        id="docs-search-dialog"
        aria-labelledby="docs-search-title"
        ref={dialog}
        // A click on the backdrop lands on the <dialog> itself; clicks inside land on the panel.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="search-dialog-panel">
          <div className="search-dialog-header">
            <p className="search-dialog-title" id="docs-search-title">
              Search
            </p>
            <button type="button" className="icon-button search-close" aria-label="Close search" onClick={() => dialog.current?.close()}>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 0 0-1.06-1.06L10 8.94 5.28 4.22Z"
                ></path>
              </svg>
            </button>
          </div>
          <div className="search-field" role="search">
            <label className="sr-only" htmlFor="docs-search">
              Search the documentation
            </label>
            <svg className="search-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65a.75.75 0 1 1-1.06 1.06l-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              ></path>
            </svg>
            <input
              id="docs-search"
              type="search"
              placeholder="Search"
              autoComplete="off"
              spellCheck="false"
              ref={input}
              onChange={(event) => onInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  links()[0]?.focus();
                }
              }}
            />
          </div>
          <div
            id="docs-search-results"
            className="search-results"
            role="region"
            aria-label="Search results"
            aria-live="polite"
            hidden={!hits && !message}
            ref={panel}
            onKeyDown={onResultsKeyDown}
          >
            {message && <p className="search-message">{message}</p>}
            {hits && (
              <ul>
                {hits.map((hit) => (
                  <li key={hit.url}>
                    <a className="search-result" href={hit.url}>
                      <span className="search-result-title">{hit.title}</span>
                      {/* Pagefind escapes the indexed text; the excerpt's only markup is its <mark> highlights. */}
                      <span className="search-result-excerpt" dangerouslySetInnerHTML={{ __html: hit.excerpt }} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
