'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const contract=JSON.parse(fs.readFileSync('docs/n21-f2-merge-source-anchors.json','utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// Explicit patch surface; all other merge anchors remain frozen at the supplied baseline.
const patchFiles=['src/app/forge/01_room_shell.js','src/audio/05_live_voice_runtime.js','src/runtime/instrument/10_entrophon_and_voice_control.js'];
const patch=JSON.parse(fs.readFileSync('docs/granular-hold-source-anchors.json','utf8'));
for(const [file,hash] of Object.entries(contract.from_n21))assert.equal(sha(file),patchFiles.includes(file)?patch[file]:hash,`N21 audio/runtime regression: ${file}`);
for(const [file,hash] of Object.entries(patch))assert.equal(sha(file),hash,`Granular Hold patch regression: ${file}`);
for(const [file,hash] of Object.entries(contract.from_n20f2))assert.equal(sha(file),hash,`N20F2 Forge/navigation regression: ${file}`);
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));
assert.ok(manifest.styles.some(s=>s.file==='styles/25_n20_forge_navigation.css'),'Navigation CSS must be in standalone');
assert.ok(manifest.files.every(f=>fs.existsSync(f)),'Standalone must contain all source units');
console.log('PASS N21 audio/runtime outside explicit Granular Hold patch unchanged; N20F2 Forge, exact Play/Save and navigation unchanged (21 SHA256 anchors)');
