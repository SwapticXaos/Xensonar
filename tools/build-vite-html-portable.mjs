#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describeXensonarBuildProfiles, getXensonarBuildProfile } from './xensonar-build-profiles.mjs';

const root = process.cwd();
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}
const profile = option('profile', 'core');
const describeOnly = args.includes('--describe');
if (describeOnly) {
  console.log(JSON.stringify(describeXensonarBuildProfiles(), null, 2));
  process.exit(0);
}
const profileConfig = getXensonarBuildProfile(profile);
const slug = option('slug', profileConfig.artifactSlug);
const artifactDir = process.env.XENSONAR_ARTIFACT_DIR || '/mnt/data';
const timeoutMs = String(process.env.XENSONAR_BUILD_TIMEOUT_MS || 25 * 60 * 1000);
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || 'dev';

const buildScript = profileConfig.buildScript;

function runNode(script, label, extraArgs = []) {
  const result = spawnSync(process.execPath, [script, ...extraArgs], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`[build-vite-html-portable] profile=${profileConfig.id} body=${profileConfig.buildBody} extras=${profileConfig.includesEmbeddedStandaloneExtras ? 'yes' : 'no'} script=${profileConfig.buildScript}`);

const runner = path.join(root, 'tools', 'run-command-with-heartbeat.mjs');
runNode(path.join(root, 'tools', 'prepare-vite-html-toolchain.mjs'), 'prepare');
runNode(path.join(root, 'tools', 'check-tailwind-singlefile-css.mjs'), 'tailwind-source');
runNode(path.join(root, 'tools', 'check-raster-workbench-drag-session-wiring.mjs'), 'raster-workbench-drag-session-wiring');

const build = spawnSync(process.execPath, [runner, '--label', `vite-${profile}`, '--timeout-ms', timeoutMs, '--', 'npm', 'run', buildScript], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
  },
});
if (build.status !== 0) process.exit(build.status || 1);

const htmlPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`[build-vite-html-portable] missing ${htmlPath}`);
  process.exit(1);
}

spawnSync(process.execPath, ['scripts/inspect-singlefile-html.mjs', htmlPath], { cwd: root, stdio: 'inherit' });
const tailwindHtmlCheck = spawnSync(process.execPath, ['tools/check-tailwind-singlefile-css.mjs', htmlPath], { cwd: root, stdio: 'inherit' });
if (tailwindHtmlCheck.status !== 0) process.exit(tailwindHtmlCheck.status || 1);
if (profileConfig.htmlBudgetBytes != null) {
  const budget = process.env.HTML_BUDGET || String(profileConfig.htmlBudgetBytes);
  const budgetCheck = spawnSync(process.execPath, ['scripts/assert-singlefile-budget.mjs', htmlPath, budget], { cwd: root, stdio: 'inherit' });
  if (budgetCheck.status !== 0) process.exit(budgetCheck.status || 1);
}

fs.mkdirSync(artifactDir, { recursive: true });
const safeSlug = String(slug).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
const outHtml = path.join(artifactDir, `Xensonar_${version}_${safeSlug}.html`);
fs.copyFileSync(htmlPath, outHtml);
console.log(`[build-vite-html-portable] HTML ready: ${outHtml}`);
