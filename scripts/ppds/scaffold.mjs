/**
 * PPDS Phase 3 scaffold: one Markdown stub per nav page, in the PPDS §8.1 tree,
 * with frontmatter from nav.json + titles.json + plugin.config.json and each
 * archetype's required headings left empty for Phase 5.
 *
 *   node scripts/ppds/scaffold.mjs          create missing pages, report the rest
 *   node scripts/ppds/scaffold.mjs --check  exit 1 if any page is missing
 *
 * Never overwrites an existing file: authored content is safe to re-run over.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { CONTENT_DIR, ROOT, groupOf, loadModel, navPages, pageSpec, parseCsv } from './model.mjs';

/** Scaffold date for editorial pages (archetype I requires one). */
const SCAFFOLD_DATE = '2026-09-15';

/**
 * Public symbols per capability and the implementation each page's Source chip
 * points at, from the reconciled list in docs/audit/capabilities.md.
 */
const CAPABILITIES = {
  globe: { symbols: ['Globe', 'GlobeProps'], source: 'packages/globe/src/Globe.tsx' },
  camera: { symbols: ['Globe', 'CameraPose', 'LatLng'], source: 'packages/globe/src/defaults.ts' },
  'render-styles': { symbols: ['Globe', 'RenderStyle'], source: 'packages/globe/src/core/materials' },
  pins: { symbols: ['Globe', 'Pin', 'PinRenderProps'], source: 'packages/globe/src/core/layers/PinLayer.ts' },
  'pin-popups': { symbols: ['Globe', 'PinPopupRenderProps', 'PinPopupPlacement'], source: 'packages/globe/src/components/DefaultPinPopup.tsx' },
  'pin-clustering': { symbols: ['Globe', 'ClusterRenderProps'], source: 'packages/globe/src/utils/clustering.ts' },
  connections: {
    symbols: ['Globe', 'DefaultConnection', 'PinConnection', 'ConnectionRenderProps', 'ConnectionType', 'ConnectionLineStyle', 'ConnectionPathPoint'],
    source: 'packages/globe/src/core/layers/connections.ts',
  },
  'custom-assets': {
    symbols: ['Globe', 'GlobeAssets', 'CountryCollection', 'CountryFeature', 'CountryProperties', 'CapitalRecord'],
    source: 'packages/globe/src/assets/index.ts',
  },
  borders: { symbols: ['Globe'], source: 'packages/globe/src/core/layers/VectorLayer.ts' },
  'country-names': { symbols: ['Globe'], source: 'packages/globe/src/components/CountryLabel.tsx' },
  capitals: { symbols: ['Globe', 'CapitalRecord'], source: 'packages/globe/src/components/CapitalMarker.tsx' },
  localization: {
    symbols: ['Globe', 'GLOBE_LOCALES', 'DEFAULT_GLOBE_MESSAGES', 'localizedName', 'GlobeLocale', 'GlobeMessages'],
    source: 'packages/globe/src/i18n.ts',
  },
  graticule: { symbols: ['Globe'], source: 'packages/globe/src/core/layers/GraticuleLayer.ts' },
  background: { symbols: ['Globe'], source: 'packages/globe/src/Globe.tsx' },
  gestures: { symbols: ['Globe'], source: 'packages/globe/src/core/controls/PointerControls.ts' },
  controls: { symbols: ['Globe', 'GlobeControlsRenderProps'], source: 'packages/globe/src/components/DefaultControls.tsx' },
  'country-interaction': { symbols: ['Globe', 'CountryFeature', 'CountryProperties'], source: 'packages/globe/src/core/layers/HighlightLayer.ts' },
  'camera-api': { symbols: ['GlobeHandle', 'CameraPose', 'LatLng'], source: 'packages/globe/src/core/GlobeEngine.ts' },
  'auto-rotate': { symbols: ['GlobeHandle'], source: 'packages/globe/src/core/GlobeEngine.ts' },
  'screen-projection': { symbols: ['GlobeHandle', 'ScreenPoint', 'LatLng'], source: 'packages/globe/src/utils/coordinates.ts' },
  'lazy-loading': { symbols: ['GlobeLazy'], source: 'packages/globe/src/Globe.lazy.tsx' },
  'error-handling': { symbols: ['Globe', 'GlobeHandle'], source: 'packages/globe/src/components/GlobeErrorBoundary.tsx' },
};

const TODO_DESCRIPTION = 'TODO: one-line description (Phase 5).';

const REQUIRED_H2 = {
  A: (config) => ['Introduction', `Why ${config.name}`, 'Start now'],
  B: () => ['Basics', 'Customization', 'Limitations'],
  C: () => [],
  F: () => ['Prerequisites', 'Installation', 'Minimal working example', 'Verification', 'Next steps'],
  I: () => [],
};

function portingHints(pathname) {
  const rows = parseCsv(readFileSync(join(ROOT, 'docs', 'migration', 'section-map.csv'), 'utf8'));
  return rows
    .filter((r) => r.target_url.split(' ').includes(pathname))
    .map((r) => `<!-- Port from ${r.legacy_source} › ${r.legacy_heading} → ${r.target_slot} (${r.action})${r.notes ? `. ${r.notes}` : ''} -->`);
}

function frontmatter(entry, spec, config, titles) {
  const { node } = entry;
  const title = titles[node.pathname];
  if (spec.archetype === 'B') {
    const capability = CAPABILITIES[node.capabilityId];
    if (!capability) throw new Error(`no symbols/source recorded for capability ${node.capabilityId}`);
    if (!existsSync(join(ROOT, capability.source))) throw new Error(`source path missing: ${capability.source}`);
    return {
      pluginId: config.id,
      capabilityId: node.capabilityId,
      title,
      description: TODO_DESCRIPTION,
      group: groupOf(entry),
      plan: node.plan,
      ...(node.lifecycle ? { lifecycle: node.lifecycle } : {}),
      symbols: capability.symbols,
      links: {
        issues: config.links.issues,
        source: capability.source,
      },
    };
  }
  return {
    pluginId: config.id,
    title,
    // P10: the docs root reuses the one description written in plugin.config.json.
    description: spec.archetype === 'A' ? config.description : TODO_DESCRIPTION,
    ...(spec.archetype === 'I' ? { date: SCAFFOLD_DATE } : {}),
  };
}

function body(entry, spec, config) {
  const lines = [];
  const hints = portingHints(entry.node.pathname);
  if (spec.archetype === 'C') {
    lines.push('<!-- TODO: 1–2 scope paragraphs — what is in, what is deliberately out. The feature groups are rendered from nav.json. -->');
  } else if (spec.archetype === 'I') {
    lines.push('<!-- TODO: body (Phase 5). -->');
  }
  if (spec.archetype === 'B') {
    lines.push('<!-- The H1, one-line description, resource chips and ## API are rendered from frontmatter. -->');
  }
  lines.push(...hints);
  for (const heading of REQUIRED_H2[spec.archetype](config)) {
    lines.push('', `## ${heading}`);
  }
  return `${lines.join('\n')}\n`;
}

const check = process.argv.includes('--check');
const { config, nav, titles } = loadModel();
const created = [];
const existing = [];
const missing = [];

for (const entry of navPages(nav)) {
  const spec = pageSpec(entry, config);
  const path = join(CONTENT_DIR, spec.file);
  if (existsSync(path)) {
    existing.push(spec.file);
    continue;
  }
  if (check) {
    missing.push(spec.file);
    continue;
  }
  mkdirSync(dirname(path), { recursive: true });
  const doc = `---\n${stringify(frontmatter(entry, spec, config, titles), { lineWidth: 0 })}---\n\n${body(entry, spec, config)}`;
  writeFileSync(path, doc);
  created.push(`${spec.archetype}  ${spec.file}`);
}

if (check) {
  if (missing.length) {
    console.log(`missing ${missing.length} page file(s):\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`all ${existing.length} nav pages have a file`);
} else {
  console.log(`created ${created.length}, kept ${existing.length} existing`);
  for (const line of created) console.log(`  + ${line}`);
}
