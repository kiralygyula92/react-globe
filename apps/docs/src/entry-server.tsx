/**
 * Renders a route to a complete HTML document. Used twice: by the build, which writes every
 * route to a file, and by the development server, which renders one route per request.
 */
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocPage, docHeadings } from './app/DocPage';
import type { Assets } from './app/DocsLayout';
import { NotFound } from './app/NotFound';
import { ReferencePage, referenceHeadings } from './app/ReferencePage';
import { renderMarkdown } from './lib/markdown';
import { withSite } from './lib/generate';
import { getPages, type Page } from './lib/site';

export type { Assets };
export { getPages };
export * from './lib/generate';

/** Where a route's HTML file goes, relative to the output directory. */
export const filePathFor = (route: string): string => (route === '/404' ? '404.html' : `${route.replace(/^\/|\/$/g, '')}/index.html`);

/** Every route this site renders as HTML: the nav's pages, plus the not-found page. */
export function routes(): string[] {
  return [...getPages().map((page) => page.pathname), '/404'];
}

const html = (element: ReactElement): string => `<!DOCTYPE html>${renderToStaticMarkup(element)}`;

export async function renderRoute(route: string, { site, assets }: { site: URL; assets: Assets }): Promise<string | null> {
  if (route === '/404') return html(<NotFound assets={assets} />);

  const page: Page | undefined = getPages().find((p) => p.pathname === route);
  if (!page) return null;

  if (page.reference) {
    return html(<ReferencePage page={page} headings={referenceHeadings(page)} site={site} assets={assets} />);
  }

  const entry = page.entry!;
  const { html: body, headings } = await renderMarkdown(withSite(entry.body, site), entry.filePath);
  return html(<DocPage page={page} html={body} headings={docHeadings(page, headings)} site={site} assets={assets} />);
}
