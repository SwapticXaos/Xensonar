import fs from 'node:fs';

const files = {
  app: 'src/App.tsx',
  bridge: 'src/features/xensonar/material/useResonanceMaterialLoopBridge.ts',
  controller: 'src/features/xensonar/material/useRootFollowLoopBankController.ts',
  anchorMode: 'src/features/xensonar/rootFollow/rootFollowAnchorMode.ts',
  control: 'src/features/xensonar/rooms/materialLoopPanel/RootFollowAnchorControl.tsx',
};

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read(files.app);
const bridge = read(files.bridge);
const controller = read(files.controller);
const anchorMode = read(files.anchorMode);
const control = read(files.control);

const failures = [];
function expectIncludes(name, content, needle) {
  if (!content.includes(needle)) failures.push(`${name} missing: ${needle}`);
}

expectIncludes(files.app, app, 'getDefaultRootFollowAnchorHz: () => Math.max(1, nexusParamsRef.current.gridBase / 2)');
expectIncludes(files.bridge, bridge, 'getDefaultRootFollowAnchorHz');
expectIncludes(files.controller, controller, 'const resolveDefaultRootFollowAnchorHz = () => Math.max(1, getDefaultRootFollowAnchorHz());');
expectIncludes(files.controller, controller, 'rootHz: Number.isFinite(entry.rootHz ?? NaN) ? entry.rootHz ?? null : defaultAnchorHz');
expectIncludes(files.controller, controller, "registerUploadedAudioLoop({ file, bars, target: 'root-follow', rootHz: defaultAnchorHz })");
expectIncludes(files.anchorMode, anchorMode, "ROOT_FOLLOW_FLEXIBLE_ANCHOR_BUTTON_LABEL = 'Flexibel (knistert manchmal)'");
expectIncludes(files.control, control, 'ROOT_FOLLOW_FLEXIBLE_ANCHOR_BUTTON_LABEL');

const addStart = controller.indexOf('const addToRootFollowLoopBank');
const addEnd = controller.indexOf('const setRootFollowLoopAnchor', addStart);
const addBlock = controller.slice(addStart, addEnd);
if (addBlock.includes('getCurrentRootFollowAnchorHz()')) {
  failures.push('addToRootFollowLoopBank must not use live cursor/root anchor as default');
}

const uploadStart = controller.indexOf('const uploadRootFollowLoopFile');
const uploadEnd = controller.indexOf('return {', uploadStart);
const uploadBlock = controller.slice(uploadStart, uploadEnd);
if (uploadBlock.includes('getCurrentRootFollowAnchorHz()')) {
  failures.push('uploadRootFollowLoopFile must not use live cursor/root anchor as default');
}

if (failures.length) {
  console.error('Root-Follow fixed-anchor default contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Root-Follow fixed-anchor default contract OK');
