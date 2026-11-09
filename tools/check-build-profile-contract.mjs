#!/usr/bin/env node
import fs from 'node:fs';
import { XENSONAR_BUILD_PROFILES } from './xensonar-build-profiles.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const builder = fs.readFileSync('tools/build-vite-html-portable.mjs', 'utf8');
const vite = fs.readFileSync('vite.config.ts', 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const core = XENSONAR_BUILD_PROFILES.core;
const full = XENSONAR_BUILD_PROFILES.full;
const production = XENSONAR_BUILD_PROFILES.production;
const singlefile = XENSONAR_BUILD_PROFILES.singlefile;

expect(core.buildScript === 'build:core-singlefile', 'core profile must use build:core-singlefile');
expect(core.buildBody === 'core' && core.coreTestBuild === true, 'core profile identity must be body=core + coreTestBuild=true');
expect(core.includesEmbeddedStandaloneExtras === false, 'core profile must exclude embedded standalone extras');
expect(Number.isInteger(core.htmlBudgetBytes) && core.htmlBudgetBytes > 0, 'core profile must keep an explicit HTML budget');
expect(full.buildScript === 'build:full-browser-html', 'full profile must use build:full-browser-html');
expect(full.buildBody === 'full' && full.coreTestBuild === false, 'full profile identity must be body=full + coreTestBuild=false');
expect(full.includesEmbeddedStandaloneExtras === true, 'full profile must include embedded standalone extras');
expect(full.htmlBudgetBytes === null, 'full browser profile must not reuse the core HTML budget');
expect(production.buildScript === 'build:production', 'portable builder must preserve the legacy production profile');
expect(singlefile.buildScript === 'build:singlefile', 'portable builder must preserve the legacy singlefile profile');

const coreScript = String(pkg.scripts?.['build:core-singlefile'] ?? '');
const fullScript = String(pkg.scripts?.['build:full-singlefile'] ?? '');
const fullBrowserScript = String(pkg.scripts?.['build:full-browser-html'] ?? '');
expect(coreScript.includes('XENSONAR_CORE_TEST_BUILD=1'), 'build:core-singlefile must set XENSONAR_CORE_TEST_BUILD=1');
expect(coreScript.includes('XENSONAR_BUILD_BODY=core'), 'build:core-singlefile must set XENSONAR_BUILD_BODY=core');
expect(fullScript.includes('XENSONAR_CORE_TEST_BUILD=0'), 'build:full-singlefile must set XENSONAR_CORE_TEST_BUILD=0');
expect(fullScript.includes('XENSONAR_BUILD_BODY=full'), 'build:full-singlefile must set XENSONAR_BUILD_BODY=full');
expect(fullBrowserScript.includes('build:full-singlefile'), 'build:full-browser-html must start from the full singlefile build');
expect(fullBrowserScript.includes('inject-embedded-standalone-assets-into-html.mjs'), 'full browser build must inject standalone extras');
expect(fullBrowserScript.includes('xensonar:check-full-singlefile-extras-inline'), 'full browser build must verify injected extras');

expect(builder.includes("from './xensonar-build-profiles.mjs'"), 'portable HTML builder must use the central build-profile definition');
expect(builder.includes('profileConfig.buildScript'), 'portable HTML builder must resolve the build script through the profile definition');
expect(builder.includes('profileConfig.htmlBudgetBytes'), 'portable HTML builder must resolve the HTML budget through the profile definition');
expect(vite.includes('requestedBuildBody === "core"'), 'Vite must recognize the explicit core build body');
expect(vite.includes('const extrasEnabled = !coreTestBuildEnabled'), 'Vite extras gate must remain coupled to non-core builds');

if (failures.length) {
  console.error('[xensonar][build-profile-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar][build-profile-contract] PASS');
console.log(JSON.stringify({
  core: { script: core.buildScript, slug: core.artifactSlug, extras: core.includesEmbeddedStandaloneExtras, budget: core.htmlBudgetBytes },
  full: { script: full.buildScript, slug: full.artifactSlug, extras: full.includesEmbeddedStandaloneExtras, budget: full.htmlBudgetBytes },
}, null, 2));
