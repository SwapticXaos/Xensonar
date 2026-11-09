'use strict';
// Architectural regression gates: singleton behavior ownership and explicit export/import seams.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const bridge=read('src/mix/03_meta_menu__before_v2-session-store.js');
const session=read('src/sessions/v2-session-store.js');
const eq=read('src/quickrack/equalizer/eq-core.js');
const donor=read('src/storage/02_donor_packages.js');
const forge=read('src/storage/03_forge_packages.js');
assert.equal((bridge.match(/\bstartMuted\s*\(\)\s*\{/g)||[]).length,1,
  'Main Room bridge must have exactly one startMuted implementation (no silent object-method override)');
assert.match(session,/const KEY='xensonar\.meta-sessions\.v2'/,
  'V2 remains canonical archive store');
assert.match(session,/if\(!ensureHydrated\(\)\)return false/,
  'V2 writes must be guarded by hydration');
assert.match(eq,/const __XenEQ = \(\(\) => \{/,
  'EQ must remain behind its canonical facade');
for(const [name,text] of [['donor',donor],['forge',forge]]){
 assert.match(text,/schemaVersion:\s*1/,name+' export version must be explicit');
 assert.match(text,/payload\.schemaVersion\s*!==\s*1/,name+' import version must be validated');
}
console.log('ARCHITECTURE BOUNDARIES PASS: unique Main Room action and key contracts');
