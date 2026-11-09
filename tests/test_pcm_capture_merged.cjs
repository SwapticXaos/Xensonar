"use strict";
// Historical PCM1 entry point, upgraded to the integrated Float32 contract.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../dist/XenSonar_Standalone.html'),'utf8');
assert.match(html,/await __xenCreateMasterPCMRecorder\(R,I\.stream,I\.__xenPcmTap\)/);
assert.match(html,/n\.__xenPcmCapture\?n\.toWavBlob\(\)/);
assert.match(html,/n\.__xenPcmCapture\?await n\.toAudioBuffer\(t/);
assert.match(html,/new MediaRecorder\(I\.stream/);
assert.match(html,/Browser-Codec \(möglicherweise verlustbehaftet\)/);
assert.match(html,/PCM Float32 \(ohne Codec-Kompression\)/);
assert.match(html,/u\.jsx\("audio",\{ref:y,src:g,controls:!0/);
process.argv.length=2;
require('./merge_pcm2_continuity.cjs');
