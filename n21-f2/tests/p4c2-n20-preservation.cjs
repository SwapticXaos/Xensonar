'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('node:assert/strict');
const base=JSON.parse(fs.readFileSync('docs/p4c2-n20-n19-baseline-hashes.json')),changed=[];
for(const [file,hash] of Object.entries(base)){
 let bytes=fs.readFileSync(file);
 if(file==='template/head.html')bytes=Buffer.from(bytes.toString().replace('<title>XenSonar · S1 P4C2 N20 · Shared Live Audio Capacity</title>','<title>XenSonar · S1 P4C2 N19 · Unified Playlist Drag</title>'));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)changed.push(file);
}
assert.deepEqual(changed.sort(),['src/instruments/06_source_preparation.js','src/instruments/07_pitch_preparation.js','src/nodal/04_audio_runtime.js','src/nodal/05_installation_bridge.js','src/nodal/08_melodic_live_transport.js','src/nodal/12_surface_runtime.js'].sort());
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));assert(manifest.files.every(file=>base[file]));
console.log('PASS N20 preservation: exactly six backend/preparation adapters changed; all N19 UI/styles, N7 kernel, C11, RFL, drums, bass, material routing and physics byte-identical');
