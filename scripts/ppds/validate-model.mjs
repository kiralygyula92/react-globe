/**
 * PPDS Phase 2 model validation: plugin.config.json, nav.json and titles.json against
 * plugin-site.schema.json, plus the cross-file rules the schema cannot express (nav
 * depth, taxonomy, tiers, titles coverage, section order, url-map completeness).
 *
 *   node scripts/ppds/validate-model.mjs
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { ROOT, SECTIONS, TAXONOMY, flattenNav, isGroup, isMachine, legacyRows, loadModel, parseCsv } from './model.mjs';

const { config, nav, titles } = loadModel();
const schema = JSON.parse(readFileSync(join(ROOT, 'docs', 'ppds', 'plugin-site.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'ppds');

let failures = 0;
const result = (name, errors) => {
  failures += errors.length;
  console.log(`${errors.length ? 'FAIL' : 'PASS'}  ${name}`);
  for (const e of errors) console.log(`      - ${e}`);
};
const schemaCheck = (name, ref, data) => {
  const validate = ajv.getSchema(ref);
  result(name, validate(data) ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`));
};

schemaCheck('plugin.config.json ⟶ plugin-site.schema.json (root)', 'ppds', config);
schemaCheck('nav.json ⟶ #/$defs/navTree', 'ppds#/$defs/navTree', nav);
schemaCheck('titles.json ⟶ #/$defs/titleMap', 'ppds#/$defs/titleMap', titles);

const entries = flattenNav(nav);
const prefix = `/${config.id}/`;
const pathnames = new Set(entries.map((e) => e.node.pathname));

result('N5 nav depth ≤ 3', entries.filter((e) => e.depth > 3).map((e) => `${e.node.pathname} at depth ${e.depth}`));
result('nav pathnames unique', entries.map((e) => e.node.pathname).filter((p, i, all) => all.indexOf(p) !== i));
result('pathnames inside the plugin namespace', entries.filter((e) => !e.node.pathname.startsWith(prefix)).map((e) => e.node.pathname));
result(
  'R4 pages end with "/" (groups end "-group", machine files exempt)',
  entries.filter((e) => !isGroup(e.node) && !isMachine(e.node) && !e.node.pathname.endsWith('/')).map((e) => e.node.pathname),
);
result(
  'R3 slugs kebab-case, lowercase, no versions or dates',
  entries
    .flatMap((e) => e.node.pathname.split('/').filter(Boolean).map((seg) => [e.node.pathname, seg]))
    .filter(([, seg]) => !seg.includes('.') && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(seg) || /\d{4}|^v\d/.test(seg)))
    .map(([p, seg]) => `${p}: "${seg}"`),
);
result(
  'R1 capability pages flat under the namespace',
  entries.filter((e) => e.node.capabilityId && e.node.pathname !== `${prefix}${config.urlPrefix ?? ''}${e.node.capabilityId}/`).map((e) => e.node.pathname),
);
const capabilityIds = entries.filter((e) => e.node.capabilityId).map((e) => e.node.capabilityId);
result('capabilityId unique', capabilityIds.filter((id, i) => capabilityIds.indexOf(id) !== i));
result('subheader ∈ taxonomy', entries.filter((e) => e.node.subheader && !config.taxonomy.includes(e.node.subheader)).map((e) => e.node.pathname));
const usedTaxonomy = [...new Set(entries.filter((e) => e.node.subheader).map((e) => e.node.subheader))];
result('taxonomy terms all used, in sidebar order', JSON.stringify(usedTaxonomy) === JSON.stringify(config.taxonomy) ? [] : [JSON.stringify(usedTaxonomy)]);
result('§5 taxonomy terms from the portfolio vocabulary', config.taxonomy.filter((t) => !TAXONOMY.includes(t)));
const tierIds = config.tiers.map((t) => t.id);
result('N4 plan ∈ tiers', entries.filter((e) => e.node.plan && !tierIds.includes(e.node.plan)).map((e) => e.node.pathname));
result('capability nodes declare a plan', entries.filter((e) => e.node.capabilityId && !e.node.plan).map((e) => e.node.pathname));
result('capability pages sit under a subheader group', entries.filter((e) => e.node.capabilityId && !e.parents.at(-1)?.subheader).map((e) => e.node.pathname));
result('N2 titles.json covers every nav pathname', [...pathnames].filter((p) => !(p in titles)));
result('titles.json has no orphan keys', Object.keys(titles).filter((p) => !pathnames.has(p)));
result('capability titles ≤ 40 chars', entries.filter((e) => e.node.capabilityId && titles[e.node.pathname].length > 40).map((e) => e.node.pathname));

const configIds = config.sections.map((s) => s.id);
result('config sections in canonical order', JSON.stringify(configIds) === JSON.stringify(SECTIONS.map((s) => s.id).filter((id) => configIds.includes(id))) ? [] : [JSON.stringify(configIds)]);
const enabled = SECTIONS.filter((s) => config.sections.some((c) => c.id === s.id && c.enabled !== false));
result('mandatory sections enabled', SECTIONS.filter((s) => s.mandatory && !enabled.includes(s)).map((s) => s.id));
result(
  'sidebar top level == enabled sections in §5 order',
  JSON.stringify(nav.map((n) => n.pathname)) === JSON.stringify(enabled.map((s) => `${prefix}${s.group}`)) ? [] : [JSON.stringify(nav.map((n) => n.pathname))],
);
result('N3 reference section has no hand-typed children', (nav.find((n) => n.pathname.endsWith('/api-group'))?.children ?? []).map((c) => c.pathname));

const pages = parseCsv(readFileSync(join(ROOT, 'docs', 'audit', 'pages.csv'), 'utf8'));
const map = legacyRows();
const keyOf = (p) => (p.url.startsWith('(none') ? p.source_file : p.url);
result(
  'every legacy URL (audit/pages.csv) appears exactly once in url-map.csv',
  pages.map(keyOf).map((k) => [k, map.filter((r) => r.legacy_url === k).length]).filter(([, n]) => n !== 1).map(([k, n]) => `${k} ×${n}`),
);
result('url-map actions ∈ §10', map.filter((r) => !['port', 'split', 'merge', 'generate', 'rewrite', 'retire'].includes(r.action)).map((r) => r.legacy_url));
result('url-map rows have a target and a redirect value', map.filter((r) => !r.target_url.trim() || !r.redirect.trim()).map((r) => r.legacy_url));
result(
  'url-map internal targets resolve to nav pages (api/* generated in Phase 4)',
  map
    .flatMap((r) => [r.target_url, r.redirect.split(' ')[0]].filter((u) => u.startsWith('/')).map((u) => [r.legacy_url, u]))
    .filter(([, u]) => !pathnames.has(u) && !u.startsWith(`${prefix}api/`))
    .map(([l, u]) => `${l} → ${u}`),
);
result('tagline ≤ 120 and description ≤ 300', [
  ...(config.tagline.length > 120 ? ['tagline'] : []),
  ...(config.description.length > 300 ? ['description'] : []),
]);

console.log(failures ? `\n${failures} failure(s)` : '\nmodel valid');
process.exit(failures ? 1 : 0);
