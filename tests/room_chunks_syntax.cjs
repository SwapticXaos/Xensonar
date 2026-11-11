// The lazily evaluated room chunks live in <script type="application/x-xensonar-room"> blocks that the generic
// inline-script check skips; a broken bracket there only shows when the room opens. Check their sources directly.
const {execFileSync}=require('node:child_process'),path=require('node:path');
for(const f of ['src/post-oct/032-xen-room-multitrack.js','src/post-oct/033-xen-multitrack-shared.js']){
  execFileSync(process.execPath,['--check',path.join(__dirname,'..',f)],{stdio:'pipe'});console.log('syntax ok',f)}
