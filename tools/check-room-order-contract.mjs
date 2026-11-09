import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let ok = true;
const fail = (msg) => { console.error(`[check-room-order-contract] ${msg}`); ok = false; };
const expect = (cond, msg) => { if (!cond) fail(msg); };

const pkg = JSON.parse(read('package.json'));
const header = read('src/features/xensonar/layout/AppHeader.tsx');
const roomNav = read('src/features/xensonar/rooms/RoomNav.tsx');
const xensonarApp = read('src/features/xensonar/XensonarApp.tsx');
const xenpolarRoom = read('src/features/xensonar/rooms/XenpolarRoom.tsx');
const appRoomViewport = read('src/features/xensonar/rooms/AppRoomViewport.tsx');
const profiles = read('src/features/xensonar/rooms/roomBuildProfiles.ts');
const fullInlineCheck = read('tools/check-full-singlefile-extras-inline.mjs');
const integrationDoc = read('docs/l3lab_integration_contract.md');
const terminologyDoc = read('docs/l3lab_terminology_map.md');

expect(typeof pkg.version === 'string' && pkg.version.startsWith('3.2.91.5.'), 'package version must reflect the room-order hygiene patch');
expect(pkg.scripts?.['xensonar:check-room-order-contract'] === 'node tools/check-room-order-contract.mjs', 'room-order contract script missing from package.json');

for (const [name, src] of [['AppHeader', header], ['RoomNav', roomNav]]) {
  const i = src.indexOf('I. XENSONAR HAUPTRAUM');
  const ii = src.indexOf('II. MATERIALSCHMIEDE');
  const iii = src.indexOf('III. NODAL INSTALLATION');
  const iv = src.indexOf('IV. SPIELE');
  expect(i >= 0, `${name} missing I. XENSONAR HAUPTRAUM`);
  expect(ii >= 0, `${name} missing II. MATERIALSCHMIEDE`);
  expect(iii >= 0, `${name} missing III. NODAL INSTALLATION`);
  expect(iv >= 0, `${name} missing IV. SPIELE`);
  expect(i < ii && ii < iii && iii < iv, `${name} navigation order must be I, II, III, IV`);
  expect(!src.includes('II. XENSONAR FAMILIE'), `${name} still exposes Xensonar Familie as room II`);
  expect(!src.includes('IV. XENPOLAR'), `${name} still exposes Xenpolar as separate IV room`);
}

expect(xensonarApp.includes('title: "II. Materialschmiede"'), 'XensonarApp room meta must name Materialschmiede as II');
expect(xensonarApp.includes('title: "III. Nodal Installation"'), 'XensonarApp room meta must keep Nodal Installation as III');
expect(xensonarApp.includes('title: "IV Spiele"'), 'XensonarApp room meta must expose IV Spiele for Extras');
expect(!xensonarApp.includes('title: "II. Xensonar Familie"'), 'XensonarApp still has old II Xensonar Familie title');
expect(!xensonarApp.includes('title: "IV. Xenpolar"'), 'XensonarApp still has old IV Xenpolar title');

expect(xenpolarRoom.includes('Xensonar Familie & Arcade Games'), 'IV Spiele launcher must contain combined family/arcade heading');
expect(xenpolarRoom.includes('Rubrik A') && xenpolarRoom.includes('Xensonar Familie'), 'IV Spiele launcher missing Xensonar Familie rubric');
expect(xenpolarRoom.includes('Rubrik B') && xenpolarRoom.includes('Arcade Games'), 'IV Spiele launcher missing Arcade Games rubric');
expect(xenpolarRoom.includes('Materialschmiede bleibt Raum II') && xenpolarRoom.includes('Nodal Installation bleibt Raum III'), 'IV Spiele launcher missing explicit room-order explanation');

expect(profiles.includes("id: 'L3LAB'") && profiles.includes("canonicalIndex: 'II'") && profiles.includes("label: 'Materialschmiede'"), 'room profiles must mark Materialschmiede as II');
expect(profiles.includes("id: 'TOPOLOGY'") && profiles.includes("canonicalIndex: 'III'") && profiles.includes("label: 'Nodal Installation'"), 'room profiles must mark Nodal Installation as III');
expect(profiles.includes("id: 'MAIN'") && profiles.includes("canonicalIndex: 'IV Spiele'") && profiles.includes("label: 'Spiele · Xensonar Familie'"), 'room profiles must group family under IV Spiele');
expect(profiles.includes("id: 'XENPOLAR'") && profiles.includes("canonicalIndex: 'IV Spiele'") && profiles.includes("label: 'Spiele · Arcade Games'"), 'room profiles must group arcade under IV Spiele');
expect(profiles.includes("id: 'GAME'") && profiles.includes("canonicalIndex: 'IV Spiele'") && profiles.includes("label: 'Spiele · Irrlicht Arena'"), 'room profiles must group Irrlicht Arena under IV Spiele');

expect(appRoomViewport.includes('DisabledExtraRoom title="Spiele / Familie und Arcade"'), 'core fallback should name IV Spiele as combined family/arcade extras');
expect(fullInlineCheck.includes("'resonanzwerk'") && fullInlineCheck.includes("'zone'") && fullInlineCheck.includes("'strangeAttractors'") && fullInlineCheck.includes("'melodieQuest'"), 'full singlefile extras check must still require embedded family/arcade payload keys');

expect(integrationDoc.startsWith('# II Materialschmiede'), 'integration contract doc title still uses old Materialschmiede numbering');
expect(terminologyDoc.startsWith('# II Materialschmiede'), 'terminology map doc title still uses old Materialschmiede numbering');
expect(!integrationDoc.includes('III.2') && !terminologyDoc.includes('III.2'), 'Materialschmiede docs still contain the old III.2 numbering');

const srcRoot = path.join(root, 'src');
const offenders = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.(ts|tsx|md)$/.test(entry.name)) {
      const rel = path.relative(root, abs).replaceAll(path.sep, '/');
      const text = fs.readFileSync(abs, 'utf8');
      if (text.includes('II. Xensonar Familie') || text.includes('IV. Xenpolar')) offenders.push(rel);
    }
  }
}
walk(srcRoot);
expect(offenders.length === 0, `old visible room labels remain in src: ${offenders.join(', ')}`);

if (!ok) process.exit(1);
console.log('[check-room-order-contract] ok');
