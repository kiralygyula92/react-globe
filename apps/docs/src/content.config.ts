/**
 * The plugin's authored Markdown, read in place from content/react-globe/.
 *
 * Entry ids are the file paths relative to that directory, exactly as
 * scripts/ppds/model.mjs#pageSpec names them, so a nav node finds its file
 * without any file deciding its own URL (P2). The frontmatter contract is checked
 * in full by the conformance script against plugin-site.schema.json.
 */

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const docs = defineCollection({
  loader: glob({
    base: '../../content/react-globe',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\\/g, '/'),
  }),
  schema: z
    .object({
      pluginId: z.string(),
      title: z.string(),
      description: z.string(),
      capabilityId: z.string().optional(),
      group: z.string().optional(),
      plan: z.string().optional(),
      lifecycle: z.enum(['new', 'preview', 'beta', 'planned', 'deprecated', 'legacy']).optional(),
      symbols: z.array(z.string()).optional(),
      links: z.record(z.string(), z.string()).optional(),
      date: z.coerce.date().optional(),
    })
    .strict(),
});

export const collections = { docs };
