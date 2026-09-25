/**
 * Gives the relative imports in the emitted declarations their file extensions.
 *
 * The source imports `./Globe`, which Vite and TypeScript's bundler resolution both follow. A
 * consumer compiling with `moduleResolution: node16` or `nodenext` resolves this ES module's
 * declarations the way Node would, where a relative import needs its extension; without one the
 * import fails there and every type behind it turns into `any`. Each specifier is checked against
 * the files tsc wrote, so one that matches nothing fails the build instead of shipping.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
/** `from './x'`, `import('./x')` and a bare `import './x'`. */
const SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;

function declarations(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return declarations(path);
    return entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

function withExtension(file, specifier) {
  if (/\.(js|json|css)$/.test(specifier)) return specifier;
  const target = resolve(dirname(file), specifier);
  if (existsSync(`${target}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(target, 'index.d.ts'))) return `${specifier.replace(/\/$/, '')}/index.js`;
  throw new Error(`${file}: no declaration file for "${specifier}"`);
}

let rewritten = 0;
for (const file of declarations(DIST)) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(SPECIFIER, (_match, lead, quote, specifier) => `${lead}${quote}${withExtension(file, specifier)}${quote}`);
  if (after !== before) {
    writeFileSync(file, after);
    rewritten++;
  }
}
console.log(`dts-extensions: ${rewritten} declaration files updated`);
