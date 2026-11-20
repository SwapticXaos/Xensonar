'use strict';
// TS-MOD-01: the typed modules in src/ts/** pass `tsc --strict` (tools/slim, pinned TypeScript). Needs `npm ci --prefix tools/slim`.
const {spawnSync}=require('node:child_process');const path=require('node:path');
const tsc=path.join(__dirname,'../tools/slim/node_modules/typescript/bin/tsc');
const r=spawnSync(process.execPath,[tsc,'-p',path.join(__dirname,'../src/ts')],{encoding:'utf8'});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');console.log(r.status===0?'OK typecheck src/ts':'TYPECHECK FAILED');process.exit(r.status===0?0:1);
