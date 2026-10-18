'use strict';
// Refactoring Workshop RW1: characterize the source boundary, not merely file counts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=require('../source-manifest.json');
const pieces=[
 'src/audio/03_rfl_transport_legacy.js',
 'src/audio/03_flac_encoder.js',
 'src/audio/03_recorder_helpers.js',
 'src/audio/03_pcm_range.js',
 'src/audio/03_recorder.js',
];
const source=pieces.map(p=>fs.readFileSync(path.join(root,p)));
const reconstructed=Buffer.concat(source);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(reconstructed.length,139285,'Original recorder source length changed');
assert.equal(sha(reconstructed),'d26a978a785ae058e991843490e9e186f2c902fa9129f007844db0edcc989578','Source bytes no longer match the frozen original');
assert(source[1].includes(Buffer.from('function f319FlacWorkerEntry()')));
assert(source[1].includes(Buffer.from('function f319RecorderFlacEncode(')));
assert(!source[0].includes(Buffer.from('function f319FlacWorkerEntry()')));
assert(!source[2].includes(Buffer.from('function f319RecorderFlacEncode(')));
const idx=manifest.files.indexOf(pieces[0]);
assert.deepEqual(manifest.files.slice(idx,idx+5),pieces,'Assembly ordering changed');
const html=fs.readFileSync(path.join(root,manifest.entry));
assert.equal(sha(html),manifest.sha256,'Runtime HTML mismatches manifest');
assert.equal(html.length,manifest.bytes,'Runtime byte count mismatches manifest');
assert.equal(sha(html),'5ee222f8e1cdf4d27ce2cb0b2b4767d5734ad5bf11989cb04d807ed661b04bdc','Distribution HTML differs from F4.4.3');
console.log('PASS RW1/RW2: five source units, original assembled source bytes, manifest order and the exact original F4.4.3 HTML SHA-256');
