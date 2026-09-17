/**
 * Takes over the parts of a rendered page that react to the reader: the header (version
 * selector, search, theme switch) and the right rail. Both are hydrated in place, so the
 * markup the browser already painted is the markup React keeps.
 *
 * The live demos a page contains load separately, and only on pages that have one.
 */
import '@fontsource-variable/inter';
import './styles/docs.css';
import { hydrateRoot } from 'react-dom/client';
import { Header } from './client/Header';
import { Toc } from './client/Toc';
import type { PageData } from './lib/props';

const data = (() => {
  const script = document.getElementById('docs-data');
  return script?.textContent ? (JSON.parse(script.textContent) as PageData) : null;
})();

if (data) {
  const header = document.querySelector('.header-inner');
  if (header) hydrateRoot(header, <Header {...data.header} />);

  const toc = document.querySelector('.toc');
  if (toc) hydrateRoot(toc, <Toc headings={data.headings} />);
}

if (document.querySelector('figure[data-demo]')) void import('./scripts/demos');

// Page views and Core Web Vitals, from the deployed site only.
if (import.meta.env.VITE_INSIGHTS) void import('./client/insights');
