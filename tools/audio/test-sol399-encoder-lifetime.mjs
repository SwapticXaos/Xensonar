import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xensonar-sol399-encoder-'));
const src = path.join(root, 'src');
const dst = path.join(tmp, 'src');
fs.cpSync(src, dst, { recursive: true });

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) sourceFiles.push(p);
  }
};
walk(dst);
const importRe = /(\b(?:from|import)\s*[\(]?\s*["'])(\.\.?\/[^"']+)(["'])/g;
for (const file of sourceFiles) {
  const dir = path.dirname(file);
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(importRe, (whole, prefix, spec, suffix) => {
    if (path.extname(spec)) return whole;
    for (const ext of ['.ts', '.tsx', '.js']) {
      if (fs.existsSync(path.resolve(dir, spec + ext))) return prefix + spec + ext + suffix;
    }
    for (const ext of ['.ts', '.tsx', '.js']) {
      if (fs.existsSync(path.resolve(dir, spec, 'index' + ext))) return prefix + spec + '/index' + ext + suffix;
    }
    return whole;
  });
  fs.writeFileSync(file, text);
}

const child = path.join(tmp, 'test.mjs');
fs.writeFileSync(child, String.raw`
const { TonePlanRecordEncoder } = await import('./src/features/xensonar/browserImplant/protocol/tonePlanRecord.ts');
const { encodeResolvedWaveStarterCoreForKernel } = await import('./src/features/xensonar/browserImplant/waveStarterTonePlanTransport.ts');
const { MessagePortTonePlanPool } = await import('./src/features/xensonar/browserImplant/transport/messagePortPool.ts');
const { allocateTonePlanRing, RingbufTonePlanWriter, RingbufTonePlanReader } = await import('./src/features/xensonar/browserImplant/transport/ringbufTonePlan.ts');
const eq=(a,b)=>a.length===b.length && a.every((v,i)=>v===b[i]);
const mk=(mul=1)=>({tones:[
 {frequencyHz:220*mul,gain:0.125,delaySec:0,durationSec:0.12,waveform:'sine',resonance:0.2,cutoffHz:3400},
 {frequencyHz:330*mul,gain:0.0625,delaySec:0.003,durationSec:0.2,waveform:'triangle',resonance:0.4,cutoffHz:5100},
 {frequencyHz:440*mul,gain:0.03125,delaySec:0.007,durationSec:0.33,waveform:'sawtooth',resonance:0.1,cutoffHz:7200},
]});
const cases=[
 {plan:mk(1),sampleRate:48000,epoch:7,frame:123456789n,token:11,eventId:91},
 {plan:mk(1.0003),sampleRate:48000,epoch:7,frame:123457045n,token:12,eventId:92},
 {plan:mk(0.5),sampleRate:44100,epoch:8,frame:0x1ffffffffn,token:0xffffffff,eventId:0x80000001},
];
const shared=new TonePlanRecordEncoder();
for(const c of cases){
 const fresh=encodeResolvedWaveStarterCoreForKernel(c).slice();
 const reused=encodeResolvedWaveStarterCoreForKernel({...c,encoder:shared}).slice();
 if(!eq(fresh,reused)) throw new Error('fresh/reused record mismatch');
}
let sent=[];
const port={postMessage:(msg)=>{sent.push(new Uint32Array(msg.buffer).slice());}};
const pool=new MessagePortTonePlanPool(port,2);
const a=encodeResolvedWaveStarterCoreForKernel({...cases[0],encoder:shared});
const aExpected=a.slice();
if(!pool.trySend(a)) throw new Error('message-port A send failed');
encodeResolvedWaveStarterCoreForKernel({...cases[1],encoder:shared});
if(!eq(sent[0],aExpected)) throw new Error('message-port retained encoder scratch alias');
const sab=allocateTonePlanRing(4);
const writer=new RingbufTonePlanWriter(sab);
const reader=new RingbufTonePlanReader(sab);
const sabA=encodeResolvedWaveStarterCoreForKernel({...cases[0],encoder:shared});
const sabAExpected=sabA.slice();
if(!writer.trySend(sabA)) throw new Error('SAB A send failed');
const sabB=encodeResolvedWaveStarterCoreForKernel({...cases[1],encoder:shared});
const sabBExpected=sabB.slice();
if(!writer.trySend(sabB)) throw new Error('SAB B send failed');
const popA=reader.tryPop()?.slice();
const popB=reader.tryPop()?.slice();
if(!popA||!eq(popA,sabAExpected)) throw new Error('SAB A mutated after scratch reuse');
if(!popB||!eq(popB,sabBExpected)) throw new Error('SAB B mismatch');
console.log(JSON.stringify({pass:true,bitEqualCases:cases.length,messagePortCopy:true,sabCopy:true,words:aExpected.length}));
`);

const result = spawnSync(process.execPath, ['--experimental-transform-types', child], { encoding: 'utf8' });
fs.rmSync(tmp, { recursive: true, force: true });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
process.stdout.write(result.stdout);
