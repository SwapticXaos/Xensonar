'use strict';
// SLIM gate: no identifier may be used that is defined nowhere in the page (catches a declaration removed while a caller remains).
// Known, runtime-guarded names are listed in tools/slim/undefined_baseline.txt. Needs `npm ci --prefix tools/slim`.
const {spawnSync}=require('node:child_process');const path=require('node:path');
const r=spawnSync(process.execPath,[path.join(__dirname,'../tools/slim/undefined_names.cjs')],{encoding:'utf8'});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exit(r.status===0?0:1);
