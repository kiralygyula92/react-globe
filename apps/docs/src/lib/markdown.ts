/**
 * Markdown to HTML, the same pipeline for pages and for anything else that renders
 * authored prose: GitHub-flavoured Markdown, typographic punctuation, the docs
 * directives (::demo, ::include, :::info) and dual-theme syntax highlighting.
 *
 * Headings are collected while the tree is still in memory, so a page's table of
 * contents and its HTML always agree.
 */

import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { Root } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import smartypants from 'remark-smartypants';
import { createHighlighter, type Highlighter } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { CONTENT_DIR } from '../../../../scripts/docs/model.mjs';
import type { Heading } from './props';
import { remarkDocs } from './remark-docs.mjs';

/** Every H2/H3 with the id rehype-slug gave it, in document order. */
function collectHeadings(headings: Heading[]) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node) => {
      const depth = /^h([1-6])$/.exec(node.tagName)?.[1];
      if (!depth) return;
      headings.push({ depth: Number(depth), slug: String(node.properties?.id ?? ''), text: toString(node) });
    });
  };
}

const THEMES = { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } as const;
/** The languages the pages fence their code with. A page using another one fails the build, loudly. */
const LANGUAGES = ['tsx', 'ts', 'jsx', 'js', 'json', 'bash', 'css', 'html', 'http', 'md'];

/** One highlighter for the whole build: loading the grammars again per page costs seconds. */
let highlighter: Promise<Highlighter> | null = null;
const shiki = () => (highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGUAGES }));

const processor = (headings: Heading[], instance: Highlighter) =>
  unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(smartypants)
    .use(remarkDirective)
    .use(remarkDocs, { contentDir: CONTENT_DIR })
    // The directives expand to HTML, which rehype-raw parses back into the tree.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(collectHeadings(headings))
    .use(rehypeShikiFromHighlighter, instance, { themes: THEMES, defaultColor: 'light' })
    .use(rehypeStringify, { allowDangerousHtml: true });

/** `filePath` is where the file lives: ::demo and ::include resolve their sources against it. */
export async function renderMarkdown(body: string, filePath: string): Promise<{ html: string; headings: Heading[] }> {
  const headings: Heading[] = [];
  const file = await processor(headings, await shiki()).process({ value: body, path: filePath });
  return { html: String(file), headings };
}
