/**
 * Demo entry point. Runs under StrictMode on purpose: double-invoked effects are
 * exactly what catches a globe that creates two WebGL contexts or leaks a listener.
 *
 * A second, trivial route gives the mount/unmount leak test somewhere to navigate to.
 */

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@yourscope/react-globe/globe.css';
import './index.css';
import { GlobePlayground } from './GlobePlayground';

const BLANK = '/blank';

function BlankPage() {
  return (
    <main className="flex h-dvh items-center justify-center bg-[rgb(7,11,28)] text-white">
      <a data-route href="/" className="rounded border border-white/30 px-4 py-2 font-mono text-sm hover:bg-white/10">
        {'Back to the playground'}
      </a>
    </main>
  );
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname);
    const onClick = (event: MouseEvent): void => {
      const link = (event.target as Element | null)?.closest?.('a[data-route]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      window.history.pushState(null, '', link.getAttribute('href') ?? '/');
      onPop();
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return path === BLANK ? <BlankPage /> : <GlobePlayground />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
