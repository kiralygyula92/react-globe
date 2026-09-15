/**
 * Mounts the live demos a page contains. Each `figure[data-demo]` names a
 * demo-*.tsx file colocated with its page; the module, React and the globe load only
 * when a demo is about to scroll into view, and only on pages that have one.
 */

import 'react-globe/globe.css';

type DemoModule = { default: import('react').ComponentType };

const modules = import.meta.glob<DemoModule>('../../../../content/react-globe/**/demo-*.tsx');

type RefreshWindow = Window & { $RefreshReg$?: () => void; $RefreshSig$?: () => (type: unknown) => unknown };

let preamble: Promise<void> | null = null;

/**
 * `astro dev` compiles demos with React Fast Refresh, whose code refuses to run until the
 * refresh runtime's preamble is installed. Astro installs it only for its own React islands;
 * these demos are mounted by this script, so install it here, once, before any demo loads.
 * Production builds have no refresh code, and this block is removed from them.
 */
function installRefreshPreamble(): Promise<void> {
  if (!import.meta.env.DEV) return Promise.resolve();
  preamble ??= (async () => {
    const runtime = '/@react-refresh';
    const { injectIntoGlobalHook } = (await import(/* @vite-ignore */ runtime)) as { injectIntoGlobalHook: (w: Window) => void };
    injectIntoGlobalHook(window);
    const w = window as RefreshWindow;
    w.$RefreshReg$ ??= () => {};
    w.$RefreshSig$ ??= () => (type) => type;
  })();
  return preamble;
}
const byId = new Map(Object.entries(modules).map(([path, load]) => [path.replace(/^.*content\/react-globe\//, ''), load]));

async function mount(figure: HTMLElement): Promise<void> {
  const id = figure.dataset.demo!;
  const stage = figure.querySelector<HTMLElement>('[data-demo-stage]')!;
  const load = byId.get(id);
  if (!load) {
    stage.textContent = `Demo ${id} is missing from the build.`;
    return;
  }

  await installRefreshPreamble();
  const [{ StrictMode, createElement }, { createRoot }, demo] = await Promise.all([import('react'), import('react-dom/client'), load()]);
  let root = createRoot(stage);
  const render = () => root.render(createElement(StrictMode, null, createElement(demo.default)));
  stage.replaceChildren();
  render();

  const copy = figure.querySelector<HTMLButtonElement>('[data-demo-action="copy"]')!;
  const reset = figure.querySelector<HTMLButtonElement>('[data-demo-action="reset"]')!;
  const source = figure.querySelector('.demo-source code')?.textContent ?? '';

  copy.disabled = !navigator.clipboard;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Copy failed';
    }
    setTimeout(() => (copy.textContent = 'Copy'), 1500);
  });

  reset.disabled = false;
  reset.addEventListener('click', () => {
    root.unmount();
    root = createRoot(stage);
    render();
  });
}

const figures = [...document.querySelectorAll<HTMLElement>('figure[data-demo]')];
if (figures.length > 0) {
  const start = (figure: HTMLElement) =>
    mount(figure).catch((error: unknown) => {
      const stage = figure.querySelector<HTMLElement>('[data-demo-stage]');
      if (stage) stage.textContent = `The demo could not start: ${error instanceof Error ? error.message : String(error)}`;
    });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          void start(entry.target as HTMLElement);
        }
      },
      { rootMargin: '200px 0px' },
    );
    for (const figure of figures) observer.observe(figure);
  } else {
    for (const figure of figures) void start(figure);
  }
}
