#!/usr/bin/env node
import fs from 'node:fs';
const path='src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts';
const s=fs.readFileSync(path,'utf8');
const ok=(c,m)=>{if(!c){console.error(`[bert-polytrace-smoothing-acid] ${m}`);process.exit(1);}};
ok(s.includes("bpt28"),'renderer version must advance for 7.7.28 vocal smoothing.');
ok(!s.includes('Math.random'),'Bert renderer must remain free of unseeded Math.random.');
ok(s.includes('currentColumnStillPainted') && s.includes('0.58'),'unmatched voices should decay through active painted columns instead of hard-gating.');
ok(s.includes('filterState') && s.includes('filterCoef'),'renderer should smooth the tonal geiger-counter grains with a lightweight synth filter state.');
ok(s.includes('const acid =') && s.includes('saw * 0.68'),'renderer should add the bounded Roland/acid-style timbre blend without changing pitch tracing.');
ok(s.includes('channelData[i] = 0'),'visual silence must still render as silence.');
ok(!s.includes('Moq') && !s.includes('GRIT') && !s.includes('TOUGH') && !s.includes('JUNK'),'toolkit-only vocabulary must stay out of live Bert code.');
console.log('[bert-polytrace-smoothing-acid] OK');
