/**
 * PPDS Phase 4 reference generator (§8.4–§8.5).
 *
 *   node scripts/ppds/reference.mjs          regenerate
 *   node scripts/ppds/reference.mjs --check  exit 1 if anything would change
 *
 * Reads the package's public surface with the TypeScript compiler, starting from
 * packages/globe/src/index.ts, and writes content/react-globe/reference/:
 *
 *   {Symbol}.schema.json   structure only; always overwritten (P5)
 *   {Symbol}.strings.json  prose; seeded from JSDoc, existing values never overwritten (P6)
 *   checksums.json         sha256 of every schema file (conformance check 10)
 *
 * `usedBy` inverts the `symbols` frontmatter of every page. The generated API tables
 * in packages/globe/README.md (between `ppds:reference` markers) come from the same
 * data, so the repository holds no hand-written reference table.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import { CONTENT_DIR, ROOT, loadModel, symbolPath } from './model.mjs';

const CHECK = process.argv.includes('--check');
const PACKAGE_DIR = join(ROOT, 'packages', 'globe');
const ENTRY = join(PACKAGE_DIR, 'src', 'index.ts');
const OUT = join(CONTENT_DIR, 'reference');
const README = join(PACKAGE_DIR, 'README.md');
const PACKAGE_NAME = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')).name;

const { config } = loadModel();

/* ------------------------------------------------------------------ compiler */

const tsconfig = ts.getParsedCommandLineOfConfigFile(join(PACKAGE_DIR, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram([ENTRY], { ...tsconfig.options, noEmit: true });
const checker = program.getTypeChecker();
const entryFile = program.getSourceFile(ENTRY);
const moduleSymbol = checker.getSymbolAtLocation(entryFile);

const resolveAlias = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
/** JSDoc prose with source line wraps joined, so each description is one line of text. */
const docOf = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s*\n\s*/g, ' ').trim();
const tagOf = (symbol, name) => {
  const tag = symbol.getJsDocTags(checker).find((t) => t.name === name);
  return tag ? ts.displayPartsToString(tag.text).trim() : undefined;
};
const squash = (text) => text.replace(/\s+/g, ' ').replace(/\s*;\s*}/g, ' }').trim();

function sourceLocation(declaration) {
  const file = declaration.getSourceFile();
  const { line } = file.getLineAndCharacterOfPosition(declaration.getStart());
  const filename = `/${relative(ROOT, file.fileName).replace(/\\/g, '/')}`;
  return { filename, sourceUrl: `${config.repo}/blob/main${filename}#L${line + 1}` };
}

/** A member's declared type as written in source. */
function memberType(member) {
  const decl = member.valueDeclaration ?? member.declarations?.[0];
  if (!decl) return 'unknown';
  if (ts.isMethodSignature(decl) || ts.isMethodDeclaration(decl)) {
    const params = decl.parameters.map((p) => p.getText()).join(', ');
    return squash(`(${params}) => ${decl.type ? decl.type.getText() : 'void'}`);
  }
  if (decl.type) return squash(decl.type.getText());
  return squash(checker.typeToString(checker.getTypeOfSymbolAtLocation(member, decl)));
}

const isOptional = (member) => Boolean(member.flags & ts.SymbolFlags.Optional);

/** Members of an interface or object type literal (intersections flattened), in declaration order. */
function membersOf(typeNode) {
  const type = checker.getTypeFromTypeNode(typeNode);
  return type.getProperties().filter((p) => p.valueDeclaration || p.declarations?.length);
}

function declaredTypeNode(declaration) {
  if (ts.isInterfaceDeclaration(declaration)) return null;
  if (ts.isTypeAliasDeclaration(declaration)) return declaration.type;
  return null;
}

/** Split members into options and events (`on*` callbacks), PPDS §8.4. */
function tableFrom(members, { withDefaults }) {
  const options = {};
  const events = {};
  const descriptions = { options: {}, events: {} };
  for (const member of members) {
    const name = member.getName();
    const entry = { type: { name: memberType(member) } };
    const def = withDefaults ? tagOf(member, 'default') : undefined;
    if (def !== undefined) entry.default = def;
    entry.required = !isOptional(member);
    if (tagOf(member, 'deprecated') !== undefined) entry.deprecated = true;
    const isEvent = /^on[A-Z]/.test(name);
    (isEvent ? events : options)[name] = entry;
    const text = docOf(member);
    if (text) (isEvent ? descriptions.events : descriptions.options)[name] = text;
  }
  return { options, events, descriptions };
}

/** Imported by name from the package (a type import for types). */
const importLine = (name, isType) => `import ${isType ? 'type ' : ''}{ ${name} } from '${PACKAGE_NAME}';`;

/* -------------------------------------------------------------------- symbols */

const exported = checker.getExportsOfModule(moduleSymbol).map((alias) => ({ name: alias.getName(), symbol: resolveAlias(alias) }));

/** Component props come from these types (a component's own declaration is a function). */
const COMPONENT_PROPS = { Globe: 'GlobeProps', GlobeLazy: 'GlobeProps', DefaultConnection: 'ConnectionRenderProps' };
const INHERITS = { GlobeLazy: 'Globe', Pin: 'LatLng', ConnectionPathPoint: 'ScreenPoint' };

function describeSymbol({ name, symbol }) {
  const declaration = symbol.valueDeclaration ?? symbol.declarations[0];
  const isType = Boolean(symbol.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) && !(symbol.flags & ts.SymbolFlags.Value);
  const isComponent = name in COMPONENT_PROPS;
  const isFunction = !isComponent && Boolean(symbol.flags & ts.SymbolFlags.Function);
  const kind = isType ? 'type' : isComponent ? 'component' : isFunction ? 'function' : 'setting-group';

  const schema = {
    name,
    kind,
    imports: [importLine(name, isType)],
    ...sourceLocation(declaration),
  };
  if (isComponent) schema.imports.push(`import '${PACKAGE_NAME}/globe.css';`);

  const strings = { symbolDescription: docOf(symbol) };
  let table = null;

  if (isComponent) {
    const propsSymbol = exported.find((e) => e.name === COMPONENT_PROPS[name]).symbol;
    const members = checker.getDeclaredTypeOfSymbol(propsSymbol).getProperties();
    table = tableFrom(members, { withDefaults: true });
    schema.propsType = COMPONENT_PROPS[name];
    if (name !== 'DefaultConnection') {
      // React 19 passes `ref` as a prop; both globe components accept one.
      table.options.ref = { type: { name: 'Ref<GlobeHandle>' }, required: false };
      table.descriptions.options.ref = 'Receives the imperative `GlobeHandle`.';
    }
  } else if (isType) {
    const typeNode = declaredTypeNode(declaration);
    const isObjectLike =
      ts.isInterfaceDeclaration(declaration) ||
      (typeNode && (ts.isTypeLiteralNode(typeNode) || ts.isIntersectionTypeNode(typeNode)));
    if (isObjectLike) {
      const members = ts.isInterfaceDeclaration(declaration) ? checker.getDeclaredTypeOfSymbol(symbol).getProperties() : membersOf(typeNode);
      if (members.length > 0) {
        table = tableFrom(members, { withDefaults: name === 'GlobeProps' });
      }
    }
    if (typeNode && !table) schema.definition = squash(typeNode.getText());
  } else if (isFunction) {
    const signature = checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(symbol, declaration), ts.SignatureKind.Call)[0];
    const params = {};
    const paramDocs = {};
    for (const param of signature.getParameters()) {
      const decl = param.valueDeclaration;
      params[param.getName()] = { type: { name: squash(decl.type.getText()) }, required: !decl.questionToken };
      const tagText = symbol
        .getJsDocTags(checker)
        .filter((t) => t.name === 'param')
        .map((t) => ts.displayPartsToString(t.text))
        .find((t) => t.startsWith(param.getName()));
      if (tagText) paramDocs[param.getName()] = tagText.slice(param.getName().length).replace(/^\s*-?\s*/, '');
    }
    schema.options = params;
    schema.returns = squash(checker.typeToString(signature.getReturnType()));
    schema.signature = squash(`${name}(${declaration.parameters.map((p) => p.getText()).join(', ')}): ${schema.returns}`);
    strings.optionDescriptions = paramDocs;
  } else {
    // An exported constant: its declared type, and its value where it is a plain list.
    schema.definition = squash(checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, declaration), undefined, ts.TypeFormatFlags.NoTruncation));
  }

  if (table) {
    schema.options = table.options;
    if (Object.keys(table.events).length) schema.events = table.events;
    strings.optionDescriptions = table.descriptions.options;
    if (Object.keys(table.descriptions.events).length) strings.eventDescriptions = table.descriptions.events;
  }
  if (schema.options) for (const key of Object.keys(schema.options)) if (schema.options[key] === undefined) delete schema.options[key];

  if (INHERITS[name]) schema.inheritance = { symbol: INHERITS[name], pathname: symbolPath(INHERITS[name], config) };
  return { schema, strings };
}

/* ------------------------------------------------------------- theme tokens */

/** GLOBE_THEME_TOKENS' value: transpile the dependency-free module and import it. */
async function themeTokens() {
  const source = readFileSync(join(PACKAGE_DIR, 'src', 'tokens.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  return mod.GLOBE_THEME_TOKENS;
}

/* ------------------------------------------------------------------- usedBy */

function pagesDeclaringSymbols() {
  const usedBy = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'reference') walk(path);
      } else if (name.endsWith('.md')) {
        const raw = readFileSync(path, 'utf8');
        const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
        const data = match ? parseYaml(match[1]) : null;
        if (!data?.symbols) continue;
        const file = relative(CONTENT_DIR, path).replace(/\\/g, '/');
        for (const symbol of data.symbols) {
          if (!usedBy.has(symbol)) usedBy.set(symbol, []);
          usedBy.get(symbol).push(file);
        }
      }
    }
  };
  walk(CONTENT_DIR);
  return usedBy;
}

/** content file → page pathname, via the nav model (the same mapping the site uses). */
async function fileToPathname() {
  const { navPages, pageSpec, loadModel: load } = await import('./model.mjs');
  const { nav } = load();
  return new Map(navPages(nav).map((entry) => [pageSpec(entry, config).file, entry.node.pathname]));
}

/* --------------------------------------------------------------------- write */

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const changes = [];
const warnings = [];

function writeIfChanged(path, content) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) return;
  changes.push(relative(ROOT, path).replace(/\\/g, '/'));
  if (!CHECK) writeFileSync(path, content);
}

/** Adds keys only; never replaces existing prose. Warns where source JSDoc now differs. */
function mergeStrings(path, generated, symbol) {
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const merged = { ...existing };
  for (const [key, value] of Object.entries(generated)) {
    if (typeof value === 'string') {
      if (merged[key] === undefined || merged[key] === '') merged[key] = value;
      else if (value && merged[key] !== value) warnings.push(`${symbol}.${key}: strings file differs from source JSDoc`);
      if (!merged[key]) warnings.push(`${symbol}.${key}: missing prose`);
    } else {
      merged[key] = { ...(value ?? {}), ...Object.fromEntries(Object.entries(existing[key] ?? {}).filter(([, v]) => v !== '')) };
      for (const [sub, text] of Object.entries(value ?? {})) {
        if (existing[key]?.[sub] !== undefined && text && existing[key][sub] !== text) warnings.push(`${symbol}.${key}.${sub}: strings file differs from source JSDoc`);
      }
    }
  }
  return merged;
}

if (!CHECK) mkdirSync(OUT, { recursive: true });

const usedByFiles = pagesDeclaringSymbols();
const pathnameOf = await fileToPathname();
const tokens = await themeTokens();
const described = exported.map(describeSymbol).sort((a, b) => a.schema.name.localeCompare(b.schema.name));
const names = new Set(described.map((d) => d.schema.name));

// File names and URLs must stay unique on case-insensitive filesystems and hosts.
for (const [label, key] of [
  ['file name', (n) => n.toLowerCase()],
  ['URL', (n) => symbolPath(n, config)],
]) {
  const seen = new Map();
  for (const name of names) {
    const k = key(name);
    if (seen.has(k)) throw new Error(`[ppds] ${seen.get(k)} and ${name} collide as ${label} "${k}" — rename one export`);
    seen.set(k, name);
  }
}

for (const [symbol] of usedByFiles) if (!names.has(symbol)) warnings.push(`frontmatter declares ${symbol}, which the package does not export`);

const checksums = {};
for (const { schema, strings } of described) {
  schema.usedBy = (usedByFiles.get(schema.name) ?? []).map((file) => pathnameOf.get(file)).filter(Boolean).sort();
  if (schema.usedBy.length === 0) warnings.push(`${schema.name}: no page declares it (usedBy empty)`);

  if (schema.name === 'GLOBE_THEME_TOKENS') {
    schema.tokens = tokens.map((t) => ({ name: t.name, usages: t.usages }));
    strings.tokenDescriptions = Object.fromEntries(tokens.map((t) => [t.name, t.description]));
  }
  for (const [key, entry] of Object.entries(schema.options ?? {})) if (!strings.optionDescriptions?.[key]) warnings.push(`${schema.name}.${key}: no description`);

  const ordered = {
    name: schema.name,
    kind: schema.kind,
    imports: schema.imports,
    ...(schema.signature ? { signature: schema.signature } : {}),
    ...(schema.definition ? { definition: schema.definition } : {}),
    ...(schema.propsType ? { propsType: schema.propsType } : {}),
    ...(schema.options ? { options: schema.options } : {}),
    ...(schema.returns ? { returns: schema.returns } : {}),
    ...(schema.events ? { events: schema.events } : {}),
    ...(schema.tokens ? { tokens: schema.tokens } : {}),
    inheritance: schema.inheritance ?? null,
    usedBy: schema.usedBy,
    filename: schema.filename,
    sourceUrl: schema.sourceUrl,
  };
  const schemaText = stable(ordered);
  writeIfChanged(join(OUT, `${schema.name}.schema.json`), schemaText);
  checksums[`${schema.name}.schema.json`] = createHash('sha256').update(schemaText).digest('hex');

  const stringsPath = join(OUT, `${schema.name}.strings.json`);
  writeIfChanged(stringsPath, stable(mergeStrings(stringsPath, strings, schema.name)));
}

writeIfChanged(join(OUT, 'checksums.json'), stable(checksums));

// Schema files for symbols the package no longer exports are stale; strings stay (P6 never deletes prose).
if (existsSync(OUT)) {
  for (const file of readdirSync(OUT).filter((f) => f.endsWith('.schema.json'))) {
    if (!names.has(file.replace('.schema.json', ''))) {
      changes.push(`remove ${file}`);
      if (!CHECK) rmSync(join(OUT, file));
    }
  }
}

/* ------------------------------------------------------------ README tables */

const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (text) => (text === undefined || text === '' ? '—' : `\`${cell(text)}\``);

function readmeTables() {
  const byName = new Map(described.map((d) => [d.schema.name, d]));
  const strings = (name) => {
    const path = join(OUT, `${name}.strings.json`);
    return CHECK || !existsSync(path) ? mergeStrings(path, byName.get(name).strings, name) : JSON.parse(readFileSync(path, 'utf8'));
  };
  const props = byName.get('GlobeProps');
  const propStrings = strings('GlobeProps');
  const rows = [
    ...Object.entries(props.schema.options).map(([k, v]) => [k, v, propStrings.optionDescriptions?.[k]]),
    ...Object.entries(props.schema.events ?? {}).map(([k, v]) => [k, v, propStrings.eventDescriptions?.[k]]),
  ];
  const propTable = ['| Prop | Type | Default | Description |', '|---|---|---|---|', ...rows.map(([k, v, d]) => `| \`${k}\` | ${code(v.type.name)} | ${code(v.default)} | ${cell(d)} |`)];

  const handle = byName.get('GlobeHandle');
  const handleStrings = strings('GlobeHandle');
  const handleTable = ['| Method | Signature | Description |', '|---|---|---|', ...Object.entries(handle.schema.options).map(([k, v]) => `| \`${k}\` | ${code(v.type.name)} | ${cell(handleStrings.optionDescriptions?.[k])} |`)];

  const tokenTable = [
    '| Token | Used by | Fallback | Controls |',
    '|---|---|---|---|',
    ...tokens.flatMap((t) => t.usages.map((u, i) => `| ${i === 0 ? `\`${t.name}\`` : ''} | ${u.element} (${u.property}) | \`${u.fallback}\` | ${i === 0 ? cell(t.description) : ''} |`)),
  ];
  return {
    props: propTable.join('\n'),
    handle: handleTable.join('\n'),
    tokens: tokenTable.join('\n'),
  };
}

if (existsSync(README)) {
  const tables = readmeTables();
  let readme = readFileSync(README, 'utf8');
  for (const [name, table] of Object.entries(tables)) {
    const pattern = new RegExp(`(<!-- ppds:reference:${name}:start[^>]*-->)[\\s\\S]*?(<!-- ppds:reference:${name}:end -->)`);
    if (!pattern.test(readme)) {
      warnings.push(`README has no ppds:reference:${name} markers`);
      continue;
    }
    readme = readme.replace(pattern, `$1\n${table}\n$2`);
  }
  writeIfChanged(README, readme);
}

/* -------------------------------------------------------------------- report */

for (const w of [...new Set(warnings)]) console.warn(`warning: ${w}`);
if (CHECK) {
  if (changes.length) {
    console.log(`reference is stale — run pnpm docs:reference:\n  ${changes.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`reference up to date (${described.length} symbols)`);
} else {
  console.log(`${described.length} symbols · ${changes.length} file(s) changed`);
  for (const c of changes) console.log(`  ${c}`);
}
