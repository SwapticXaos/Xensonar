import fs from 'node:fs';

const roomPath = 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx';
const room = fs.readFileSync(roomPath, 'utf8');
const lines = room.split(/\r?\n/).length;
const failures = [];
const requireText = (text, label) => { if (!room.includes(text)) failures.push(`missing ${label}`); };
const forbidText = (text, label) => { if (room.includes(text)) failures.push(`room still owns ${label}`); };

if (lines > 500) failures.push(`SpectralForgeRoom too large: ${lines} lines > 500`);
requireText("createCarrierDonorV2FrontActions", 'Carrier/Donor V2 front actions owner');
requireText("useSpectralForgeDonorWorkspace", 'donor workspace owner');
requireText("useSpectralForgeKeyboardScope", 'keyboard scope owner');
forbidText("window.addEventListener('keydown'", 'keyboard listener lifecycle');
forbidText('buildSpectralEmbodimentArtifacts({', 'V2 validation artifact transaction');
forbidText('playSelectedDonorProof(', 'donor proof playback transaction');

if (failures.length) {
  console.error('[spectralforge-room-workflow-boundaries] FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[spectralforge-room-workflow-boundaries] PASS (${lines} lines)`);
