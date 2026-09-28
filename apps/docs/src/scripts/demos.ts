/**
 * Mounts the live demos a page contains. Each `figure[data-demo]` names a
 * demo-*.tsx file colocated with its page; the module, React and the globe load only
 * when a demo is about to scroll into view, and only on pages that have one.
 */

import '@kiralygyula92/react-globe/globe.css';

type DemoModule = { default: import('react').ComponentType };

const modules = import.meta.glob<DemoModule>('../../../../content/react-globe/**/demo-*.tsx');

const byId = new Map(Object.entries(modules).map(([path, load]) => [path.replace(/^.*content\/react-globe\//, ''), load]));

/** Replaces the stage's contents with one line of explanation; the source stays below it. */
function showMessage(stage: HTMLElement, text: string): void {
  const message = document.createElement('p');
  message.className = 'demo-message';
  message.textContent = text;
  stage.replaceChildren(message);
}

/** Asked once per page: every demo needs the same thing. The probe's context is released at once. */
let webgl2: boolean | null = null;
function hasWebGL2(): boolean {
  if (webgl2 === null) {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    webgl2 = gl !== null;
  }
  return webgl2;
}

async function mount(figure: HTMLElement): Promise<void> {
  const id = figure.dataset.demo!;
  const stage = figure.querySelector<HTMLElement>('[data-demo-stage]')!;
  const load = byId.get(id);
  if (!load) {
    showMessage(stage, 'This demo is missing from the build. Its source is below.');
    return;
  }
  if (!hasWebGL2()) {
    showMessage(stage, 'This browser cannot start WebGL 2, which the globe needs, so the live demo cannot run. Its source is below.');
    return;
  }

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
      // Most often a chunk that failed to download, after a deploy or on a flaky connection. The
      // reader gets a sentence; the details go where a developer would look for them.
      console.error(`[docs] demo ${figure.dataset.demo} could not load`, error);
      const stage = figure.querySelector<HTMLElement>('[data-demo-stage]');
      if (stage) showMessage(stage, 'The live demo could not load. Reload the page to try again; its source is below.');
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
