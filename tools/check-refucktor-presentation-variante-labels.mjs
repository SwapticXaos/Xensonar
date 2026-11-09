#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const presentationPath = join(root, 'src/features/xensonar/family/refactor/refucktorPresentation.ts');
const mainRoomPath = join(root, 'src/features/xensonar/rooms/MainRoom.tsx');
const viewportPath = join(root, 'src/features/xensonar/rooms/AppRoomViewport.tsx');
const topologyPath = join(root, 'src/features/topology/MyzelTopologyPanel.tsx');
const installationPath = join(root, 'src/features/topology/MyzelInstallationControls.tsx');
const refucktorRoomPath = join(root, 'src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx');
const soundCatalogPath = join(root, 'src/features/soundLibrary/sharedSoundCatalog.ts');

const presentation = readFileSync(presentationPath, 'utf8');
const mainRoom = readFileSync(mainRoomPath, 'utf8');
const viewport = readFileSync(viewportPath, 'utf8');
const topology = readFileSync(topologyPath, 'utf8');
const installation = readFileSync(installationPath, 'utf8');
const refucktorRoom = readFileSync(refucktorRoomPath, 'utf8');
const soundCatalog = readFileSync(soundCatalogPath, 'utf8');

const failures = [];
const mustInclude = (source, needle, label) => {
  if (!source.includes(needle)) failures.push(`missing ${label}: ${needle}`);
};
const mustNotInclude = (source, needle, label) => {
  if (source.includes(needle)) failures.push(`forbidden ${label}: ${needle}`);
};

mustInclude(presentation, 'XENSONAR_VARIANTE_LABEL = "Xensonar Variante"', 'canonical variant label');
mustInclude(presentation, 'XENSONAR_VARIANTE_ACTIVE_LABEL', 'active label export');
mustInclude(presentation, 'XENSONAR_VARIANTE_NATIVE_ROOM_COPY', 'native room copy export');
mustInclude(presentation, 'XENSONAR_VARIANTE_TOPOLOGY_ROOT_LABEL', 'topology root label export');

mustInclude(mainRoom, 'XENSONAR_VARIANTE_LABEL', 'MainRoom uses variant label contract');
mustInclude(mainRoom, 'XENSONAR_VARIANTE_ACTIVE_LABEL', 'MainRoom active label contract');
mustInclude(mainRoom, 'XENSONAR_VARIANTE_NATIVE_ROOM_COPY', 'MainRoom copy contract');

mustInclude(viewport, 'XENSONAR_VARIANTE_DISABLED_ROOM_TITLE', 'disabled room title contract');
mustInclude(refucktorRoom, 'title = XENSONAR_VARIANTE_LABEL', 'Refucktor room default title contract');

mustInclude(installation, 'XENSONAR_VARIANTE_INSTALLATION_ACCESS_COPY', 'topology installation copy contract');
mustInclude(installation, 'XENSONAR_VARIANTE_LABEL', 'topology button label contract');
mustInclude(soundCatalog, 'Varianten-Pfad', 'sound catalog visible hint renamed');

const visibleSources = new Map([
  ['MainRoom.tsx', mainRoom],
  ['AppRoomViewport.tsx', viewport],
  ['MyzelTopologyPanel.tsx', topology],
  ['MyzelInstallationControls.tsx', installation],
  ['XensonarRefactorRoom.tsx', refucktorRoom],
  ['sharedSoundCatalog.ts', soundCatalog],
]);
for (const [name, source] of visibleSources) {
  mustNotInclude(source, 'Xensonar Refucktor', `${name} visible Refucktor label`);
  mustNotInclude(source, 'Xensonar Refactor', `${name} visible Refactor label`);
  mustNotInclude(source, 'Refactor-Stütze', `${name} visible Refactor-Stütze label`);
  mustNotInclude(source, 'Refactor Root', `${name} visible Refactor Root label`);
  mustNotInclude(source, 'Refactor-Pfad', `${name} visible Refactor-Pfad hint`);
}

if (failures.length) {
  console.error('[refucktor-presentation-variante-labels] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[refucktor-presentation-variante-labels] OK');
