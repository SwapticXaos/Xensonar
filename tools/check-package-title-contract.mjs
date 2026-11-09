import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (msg) => {
  console.error(`[package-title-contract] ${msg}`);
  process.exit(1);
};

const titleContract = read('src/core/systemMemory/workspacePackageTitle.ts');
const station = read('src/features/xensonar/layout/PackageStationControl.tsx');
const bridge = read('src/core/systemMemory/xensonarPackageStationBridge.ts');
const controller = read('src/features/l3lab/canonicalForge/melodicProjectWorkspaceController.ts');
const actions = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts');
const manifest = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts');
const gateManifest = read('tools/current-line-gate-manifest.mjs');

if (!titleContract.includes("WORKSPACE_PACKAGE_DEFAULT_TITLE = 'Xensonar Tüftelpaket'")) fail('Default package title must be Xensonar Tüftelpaket.');
if (!titleContract.includes('normalizeWorkspacePackageTitle')) fail('Package title normalization must live in the core package title contract.');
if (!manifest.includes("../../../core/systemMemory/workspacePackageTitle")) fail('Archive manifest must use the shared package title contract.');
if (!station.includes('Download-Alias') || !station.includes('value={packageTitle}') || !station.includes('placeholder={WORKSPACE_PACKAGE_DEFAULT_TITLE}')) fail('Package station must expose the editable human filename alias field before Jetzt speichern.');
if (!station.includes('buildPreparedJsonPackageDownloadAliasFilename')) fail('Changed alias must only derive a download filename from the prepared blob, not rebuild the package payload.');
if (station.includes('packageLabel: normalizeWorkspacePackageTitle(packageTitle)')) fail('Initial package preparation must not bind the human filename alias into the archive payload.');
if (station.includes('retitle-download') || station.includes('packageLabel: normalizedTitle') || station.includes('Paket konnte nicht mit dem geänderten Titel vorbereitet werden')) fail('Changed filename alias must not trigger a second package preparation.');
if (!bridge.includes('WorkspacePackageDownloadPrepareArgs') || !bridge.includes('packageLabel?: string')) fail('Package station bridge may still carry a backward-compatible packageLabel data-port argument.');
if (!bridge.includes('prepareWorkspacePackageDownload(prepareArgs)')) fail('Package station bridge must pass explicit prepare args to the active handler when provided.');
if (!controller.includes('downloadArgs?: WorkspacePackageDownloadPrepareArgs')) fail('Canonical workspace controller must accept backward-compatible package preparation arguments.');
if (!controller.includes('packageLabel: downloadArgs?.packageLabel')) fail('Canonical workspace controller must still pass explicit non-UI package label arguments through when callers provide them.');
if (!actions.includes('label: packageLabel')) fail('Archive build action must keep package labels as optional metadata only.');
if (!gateManifest.includes('xensonar:check-package-title-contract')) fail('Current-line gate manifest must include the editable package title contract.');
if (station.includes('Random Demo Preset')) fail('Package station UI must not seed package title from the Melodic Loop demo preset.');
if (bridge.includes('Random Demo Preset') || controller.includes('Random Demo Preset') || actions.includes('Random Demo Preset')) fail('Package export path must not leak the Melodic Loop demo preset name into package title defaults.');

console.log('[package-title-contract] OK');
