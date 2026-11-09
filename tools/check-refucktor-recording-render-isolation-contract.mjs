import fs from 'node:fs';

const path = 'src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx';
const source = fs.readFileSync(path, 'utf8');
function fail(message) {
  console.error(`[refucktor-recording-render-isolation-contract] ${message}`);
  process.exit(1);
}
function requireContains(needle) {
  if (!source.includes(needle)) fail(`missing ${needle}`);
}
function requireNotContains(needle) {
  if (source.includes(needle)) fail(`must not contain ${needle}`);
}

requireContains('function XensonarRefactorRoom(');
requireContains('export default React.memo(XensonarRefactorRoom);');
requireNotContains('data-refucktor-agent-dom-overlay');
requireNotContains('agentDomOverlayPoints');
requireNotContains('publishAgentDomOverlaySnapshot');
requireNotContains('lastAgentDomOverlayCommitRef');

console.log('[refucktor-recording-render-isolation-contract] ok');
