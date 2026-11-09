#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const reportPath = 'reports/SPECTRALFORGE_STORE_IMPORT_HYGIENE_AUDIT_3.2.91.6.9.148.md';
const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const stateRoot = 'src/features/l3lab/spectralForge/state';
const spectralRoot = 'src/features/l3lab/spectralForge';
const srcRoot = 'src';

for (const file of [reportPath, storePath, storeTypesPath, 'package.json']) requireFile(file);

const report = read(reportPath);
const store = read(storePath);
const pkg = read('package.json');

const listFiles = (dir) => {
  const out = [];
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) out.push(full.replaceAll('\\\\', '/'));
    }
  };
  walk(dir);
  return out.sort();
};

const importRegex = /import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
const extractImports = (file) => {
  const content = read(file);
  const imports = [];
  let match;
  while ((match = importRegex.exec(content))) imports.push({ specifier: match[1], statement: match[0].replace(/\s+/g, ' ').trim() });
  return imports;
};

const files = listFiles(srcRoot);
const spectralFiles = files.filter((file) => file.startsWith(`${spectralRoot}/`));
const stateFiles = files.filter((file) => file.startsWith(`${stateRoot}/`));
const nonStateSpectralFiles = spectralFiles.filter((file) => !file.startsWith(`${stateRoot}/`));

const importsStoreTypesDirectly = files.flatMap((file) => extractImports(file).filter((item) => item.specifier.endsWith('/storeTypes') || item.specifier === './storeTypes' || item.specifier === '../state/storeTypes').map((item) => ({ file, ...item })));
const externalStoreTypesImports = importsStoreTypesDirectly.filter(({ file }) => !file.startsWith(`${stateRoot}/`));
if (externalStoreTypesImports.length) {
  failures.push(`external direct storeTypes imports found: ${externalStoreTypesImports.map(({ file }) => file).join(', ')}`);
}

const internalStateImportsStore = stateFiles.flatMap((file) => extractImports(file).filter((item) => item.specifier === './store' || item.specifier === '../state/store' || item.specifier.endsWith('/state/store')).map((item) => ({ file, ...item })));
if (internalStateImportsStore.length) {
  failures.push(`state-boundary files import the public store barrel: ${internalStateImportsStore.map(({ file }) => file).join(', ')}`);
}

const storeImports = spectralFiles.flatMap((file) => extractImports(file).filter((item) => item.specifier.endsWith('/state/store') || item.specifier === '../state/store' || item.specifier === './state/store' || item.specifier === '../../state/store').map((item) => ({ file, ...item })));
const nonStateStoreImports = storeImports.filter(({ file }) => !file.startsWith(`${stateRoot}/`));
if (nonStateStoreImports.length < 20) failures.push(`expected public store imports to remain visible for compatibility; found only ${nonStateStoreImports.length}`);

for (const marker of [
  'Boundary Import Hygiene / External Import Audit',
  'Status 9.148',
  'Keine externen Direktexporte aus `storeTypes.ts`',
  'Interne Store-Boundaries dürfen `storeTypes.ts` direkt nutzen',
  'Externe Komponenten und Räume bleiben auf `../state/store`',
  'Rechen-/Audio-/Projektmodule: optional später schmalere Imports',
  'Kompatibilitäts-Barrel bleibt bewusst bestehen',
  '30 öffentliche Store-Barrel-Importstellen',
  '0 externe direkte `storeTypes.ts`-Importe',
  '0 interne Rückimporte aus `./store`',
]) requireText(reportPath, report, marker);

for (const marker of [
  "export type {",
  "} from './storeTypes';",
  'export const useStore',
  "from './storeTypes'",
]) requireText('store.ts', store, marker);

for (const marker of [
  'xensonar:check-spectralforge-store-import-hygiene-boundary',
  '3.2.91.6.9.148',
]) requireText('package.json', pkg, marker);

for (const marker of [
  "from './store'",
  "from '../state/storeTypes'",
]) {
  if (marker === "from './store'") {
    for (const file of stateFiles.filter((file) => file !== storePath)) forbidText(file, read(file), marker);
  }
}

if (failures.length) {
  console.error('[spectralforge-store-import-hygiene-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  reportPath,
  publicStoreImportCount: nonStateStoreImports.length,
  directExternalStoreTypesImportCount: externalStoreTypesImports.length,
  internalStoreBackImportCount: internalStateImportsStore.length,
  stateBoundaryTypeImportCount: importsStoreTypesDirectly.length,
}, null, 2));
