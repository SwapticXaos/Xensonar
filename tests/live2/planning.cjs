'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const s=fs.readFileSync(path.resolve(__dirname,'../../src/quickrack/equalizer/eq-core.js'),'utf8'),part=s.slice(s.indexOf(' function sample('),s.indexOf(' function create('));
// Nailed3 adds a read-only observer function; exclude only this *new seam* from
// the historical P1.5 byte-lock, keeping the original plan/Worker code pinned.
const seamStart=part.indexOf(' // UI previews are observers, not fit owners.');
const seamEnd=part.indexOf(' function releaseLiveKey(key){',seamStart);
assert(seamStart>=0&&seamEnd>seamStart,'Read-only preview seam must remain explicit');
const historical=part.slice(0,seamStart)+part.slice(seamEnd);
assert.equal(crypto.createHash('sha256').update(historical).digest('hex'),'87dd85e0ff2e63df16619a69ff5fad7174ae49b1564f47c57c29e03a95d46272','P1.5 planning/worker/cache/curve-response algorithms must stay unchanged');
console.log('PASS exact P1.5 planning, worker, cache and response preservation');
