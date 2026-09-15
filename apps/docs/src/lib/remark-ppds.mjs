/**
 * Markdown extensions for PPDS pages, on top of remark-directive:
 *
 *   ::demo{src="./demo-basics.tsx" title="…" height="380"}
 *     A live demo colocated with the page (§7.2): toolbar (copy, reset), the stage the
 *     client script mounts the component into, and the highlighted source in a
 *     <details> (show/hide source, readable without JavaScript).
 *
 *   :::info / :::warning … :::
 *     Callouts (§6 B). Anti-patterns go in :::warning with the wrong code marked.
 *
 * Any other directive is turned back into the text it was written as, so prose such
 * as "key:value" is never swallowed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit, SKIP } from 'unist-util-visit';

const CALLOUTS = { info: 'Note', warning: 'Warning' };

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function directiveAsText(node) {
  const attrs = Object.entries(node.attributes ?? {})
    .map(([k, v]) => (v === '' ? k : `${k}="${v}"`))
    .join(' ');
  const marker = node.type === 'textDirective' ? ':' : node.type === 'leafDirective' ? '::' : ':::';
  const label = node.children?.length ? `[${node.children.map((c) => c.value ?? '').join('')}]` : '';
  return `${marker}${node.name}${label}${attrs ? `{${attrs}}` : ''}`;
}

/** @param {{ contentDir: string }} options */
export function remarkPpds({ contentDir }) {
  return (tree, file) => {
    const pagePath = file.path ?? file.history?.[0];

    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;

      if (node.type === 'leafDirective' && node.name === 'demo') {
        const src = node.attributes?.src;
        if (!src || !pagePath) throw new Error(`[ppds] ::demo needs src (in ${pagePath})`);
        const abs = resolve(dirname(pagePath), src);
        if (!existsSync(abs)) throw new Error(`[ppds] demo not found: ${src} (in ${pagePath})`);
        if (!/[\\/]demo-[\w-]+\.tsx$/.test(abs)) throw new Error(`[ppds] demo files must be named demo-*.tsx next to the page: ${src}`);
        const id = relative(contentDir, abs).replace(/\\/g, '/');
        const title = node.attributes.title ?? 'Live demo';
        const height = Number(node.attributes.height ?? 380);
        const source = readFileSync(abs, 'utf8').trimEnd();

        const open =
          `<figure class="demo" data-demo="${escapeAttr(id)}" style="--demo-height:${height}px">` +
          `<div class="demo-toolbar" role="toolbar" aria-label="${escapeAttr(title)} actions">` +
          `<span class="demo-title">${escapeAttr(title)}</span>` +
          `<button type="button" data-demo-action="copy" disabled>Copy</button>` +
          `<button type="button" data-demo-action="reset" disabled>Reset</button>` +
          `</div>` +
          `<div class="demo-stage" data-demo-stage role="region" aria-label="${escapeAttr(title)}">` +
          `<p class="demo-fallback">This live demo needs JavaScript and WebGL. Its source is below.</p>` +
          `</div>` +
          `<details class="demo-source"><summary>Show source</summary>`;
        parent.children.splice(
          index,
          1,
          { type: 'html', value: open },
          { type: 'code', lang: 'tsx', value: source },
          { type: 'html', value: `</details></figure>` },
        );
        return [SKIP, index + 3];
      }

      if (node.type === 'leafDirective' && node.name === 'include') {
        // Single-source a repository Markdown file (the changelog): its H1 is dropped and
        // its remaining headings already sit under the page's own H1.
        const src = node.attributes?.src;
        const abs = src && pagePath ? resolve(dirname(pagePath), src) : null;
        if (!abs || !existsSync(abs)) throw new Error(`[ppds] ::include not found: ${src} (in ${pagePath})`);
        const included = fromMarkdown(readFileSync(abs, 'utf8'));
        const children = included.children.filter((c) => !(c.type === 'heading' && c.depth === 1));
        parent.children.splice(index, 1, ...children);
        return [SKIP, index + children.length];
      }

      if (node.type === 'containerDirective' && CALLOUTS[node.name]) {
        const label = node.children?.[0]?.data?.directiveLabel ? node.children.shift() : null;
        node.data = { hName: 'aside', hProperties: { className: ['callout', `callout-${node.name}`], role: 'note' } };
        node.children.unshift({
          type: 'paragraph',
          data: { hProperties: { className: ['callout-title'] } },
          children: label ? label.children : [{ type: 'text', value: CALLOUTS[node.name] }],
        });
        return;
      }

      if (node.type === 'textDirective' || node.type === 'leafDirective' || node.type === 'containerDirective') {
        const value = directiveAsText(node);
        parent.children.splice(index, 1, node.type === 'textDirective' ? { type: 'text', value } : { type: 'paragraph', children: [{ type: 'text', value }] });
        return [SKIP, index + 1];
      }
    });
  };
}

/** For Markdown twins: every ::include replaced by the included file without its H1. */
export function includesAsMarkdown(markdown, pageFile, contentDir) {
  return markdown.replace(/^::include\{src="([^"]+)"\}\s*$/gm, (line, src) => {
    const abs = resolve(dirname(resolve(contentDir, pageFile)), src);
    if (!existsSync(abs)) return line;
    return readFileSync(abs, 'utf8').replace(/^# .*\n+/, '').trim();
  });
}

/** For Markdown twins: every ::demo replaced by its source as a fenced block (§7.2 fallback). */
export function demosAsCode(markdown, pageFile, contentDir) {
  return markdown.replace(/^::demo\{([^}]*)\}\s*$/gm, (line, attrs) => {
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    const title = /title="([^"]+)"/.exec(attrs)?.[1] ?? 'Demo';
    if (!src) return line;
    const abs = resolve(dirname(resolve(contentDir, pageFile)), src);
    if (!existsSync(abs)) return line;
    return `**${title}**\n\n\`\`\`tsx\n${readFileSync(abs, 'utf8').trimEnd()}\n\`\`\``;
  });
}
