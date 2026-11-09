import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const expect = (cond, msg) => {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
};

const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const loops = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const groove = read('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx');

expect(status.includes('onOpenMaterialLoopManager'), 'Status strip no longer exposes material manager entrypoint');
expect(status.includes('onOpenRootFollowLoopManager'), 'Status strip no longer exposes root-follow manager entrypoint');
expect(status.includes('onOpenDrumPatternManager'), 'Status strip no longer exposes drum manager entrypoint');
expect(status.includes('onOpenBassPatternManager'), 'Status strip no longer exposes bass manager entrypoint');
expect(status.includes('Fretboard'), 'Status strip fretboard surface missing');

expect(loops.includes('HeaderVolumeControl'), 'Loop manager header volume control missing');
expect(loops.includes('Granular Manager'), 'Root-follow manager no longer exposes Granular Manager button');
expect(loops.includes('data-hotkey-scope="material-loop-manager"'), 'Loop manager dialog scope missing');

expect(groove.includes('GrooveHeaderVolumeControl'), 'Groove manager header volume control missing');
expect(groove.includes('Drum Pattern verwalten'), 'Drum pattern manager surface missing');
expect(groove.includes('Bass Pattern'), 'Bass pattern manager surface missing');

console.log('menu window surface contract ok');
