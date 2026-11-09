import fs from 'node:fs';

const wasmPath = new URL('./build-wasm/xensonar-c11.wasm', import.meta.url);
const bytes = fs.readFileSync(wasmPath);
const imports = { env: { exp: Math.exp, cos: Math.cos, sin: Math.sin, pow: Math.pow } };
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const WORDS = 64;

const EP = {
  META:0,TOKEN:1,EPOCH:2,FRAME_LO:3,FRAME_HI:4,BASE_COUNT:5,COLOR_COUNT:6,FLAGS:7,
  BASE_FREQS:8,COLOR_FREQS:14,COLOR_GAINS:17,PEAK_GAIN:20,SUSTAIN_GAIN:21,
  ATTACK_FRAMES:22,DECAY_FRAMES:23,RELEASE_START_FRAMES:24,RELEASE_FRAMES:25,STOP_AFTER_FRAMES:26,
  PITCH_BEND_MUL:27,PITCH_BEND_FRAMES:28,FILTER_START_HZ:29,FILTER_PEAK_HZ:30,FILTER_END_HZ:31,
  FILTER_ATTACK_FRAMES:32,FILTER_DECAY_FRAMES:33,FILTER_Q:34,PRE_DRIVE_GAIN:35,DRIVE_AMOUNT:36,
  BODY_FREQ_HZ:37,BODY_Q:38,BODY_GAIN:39,DELAY_FRAMES:40,DELAY_WET_GAIN:41,DELAY_FEEDBACK:42,
  NORMALIZATION_GAIN:43,AUX_ROUTE_MASK:44,
};

function hashFloats(view) {
  const words = new Uint32Array(view.buffer, view.byteOffset, view.length);
  let h = 2166136261 >>> 0;
  for (let i=0;i<words.length;i++) { h ^= words[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function countNonzero(view) { let n=0; for (const x of view) if (Number.isFinite(x) && Math.abs(x)>1e-8) n++; return n; }

async function makeEngine() {
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const ex = instance.exports;
  must(typeof ex.xen_wasm_init_profile === 'function', 'missing profile init');
  must(ex.xen_wasm_init_profile(48000, 1) === 0, 'entrophon profile init');
  return ex;
}

function writeRecord(ex, {token, freq, auxMask, frame=256}) {
  const ptr = ex.xen_wasm_record_scratch_ptr() >>> 0;
  const u = new Uint32Array(ex.memory.buffer, ptr, WORDS);
  const f = new Float32Array(ex.memory.buffer, ptr, WORDS);
  u.fill(0);
  const epoch = ex.xen_wasm_epoch() >>> 0;
  u[EP.META] = 2 | (1 << 8);
  u[EP.TOKEN] = token >>> 0; u[EP.EPOCH] = epoch;
  const bi=BigInt(frame); u[EP.FRAME_LO]=Number(bi&0xffffffffn)>>>0; u[EP.FRAME_HI]=Number((bi>>32n)&0xffffffffn)>>>0;
  u[EP.BASE_COUNT]=1; u[EP.COLOR_COUNT]=0; u[EP.FLAGS]=2 | (0 << 8); // saw + lowpass
  f[EP.BASE_FREQS]=freq;
  f[EP.PEAK_GAIN]=0.14; f[EP.SUSTAIN_GAIN]=0.05;
  u[EP.ATTACK_FRAMES]=144; u[EP.DECAY_FRAMES]=2640; u[EP.RELEASE_START_FRAMES]=7200; u[EP.RELEASE_FRAMES]=3600; u[EP.STOP_AFTER_FRAMES]=11200;
  f[EP.PITCH_BEND_MUL]=1.02; u[EP.PITCH_BEND_FRAMES]=4320;
  f[EP.FILTER_START_HZ]=2600; f[EP.FILTER_PEAK_HZ]=4900; f[EP.FILTER_END_HZ]=1612;
  u[EP.FILTER_ATTACK_FRAMES]=144; u[EP.FILTER_DECAY_FRAMES]=3840; f[EP.FILTER_Q]=4.8;
  f[EP.PRE_DRIVE_GAIN]=0.76; f[EP.DRIVE_AMOUNT]=0.52;
  f[EP.BODY_FREQ_HZ]=Math.max(80,freq*1.5); f[EP.BODY_Q]=3.2; f[EP.BODY_GAIN]=0.13;
  u[EP.DELAY_FRAMES]=4800; f[EP.DELAY_WET_GAIN]=0.03; f[EP.DELAY_FEEDBACK]=0.07;
  f[EP.NORMALIZATION_GAIN]=1; u[EP.AUX_ROUTE_MASK]=auxMask>>>0;
  must(ex.xen_wasm_submit_record(ptr, WORDS) === 0, `submit token ${token}`);
}

function renderCapture(ex, totalFrames) {
  const max=ex.xen_wasm_max_render_frames()>>>0;
  const lp=ex.xen_wasm_output_l_ptr()>>>0;
  const auxPtrs=Array.from({length:6},(_,i)=>ex.xen_wasm_output_aux_ptr(i)>>>0);
  const main=[], aux=Array.from({length:6},()=>[]);
  for(let done=0; done<totalFrames;) {
    const n=Math.min(max,totalFrames-done); must(ex.xen_wasm_render(n)===0,'render');
    main.push(...new Float32Array(ex.memory.buffer,lp,n));
    for(let r=0;r<6;r++) aux[r].push(...new Float32Array(ex.memory.buffer,auxPtrs[r],n));
    done+=n;
  }
  return { main:Float32Array.from(main), aux:aux.map(a=>Float32Array.from(a)) };
}

async function scenario(records) {
  const ex=await makeEngine();
  for(const r of records) writeRecord(ex,r);
  const out=renderCapture(ex,12000);
  ex.xen_wasm_destroy();
  return out;
}

const a = await scenario([{token:101,freq:220,auxMask:1}]);
const b = await scenario([{token:102,freq:330,auxMask:2}]);
const both = await scenario([{token:101,freq:220,auxMask:1},{token:102,freq:330,auxMask:2}]);

must(countNonzero(a.main)>0 && countNonzero(b.main)>0 && countNonzero(both.main)>0,'main PCM');
must(countNonzero(a.aux[0])>0 && countNonzero(a.aux[1])===0,'solo A aux isolation');
must(countNonzero(b.aux[1])>0 && countNonzero(b.aux[0])===0,'solo B aux isolation');
must(hashFloats(a.aux[0])===hashFloats(both.aux[0]),'overlap leaked B into aux0');
must(hashFloats(b.aux[1])===hashFloats(both.aux[1]),'overlap leaked A into aux1');
for(let r=2;r<6;r++) must(countNonzero(both.aux[r])===0,`unexpected aux${r} PCM`);

console.log(JSON.stringify({
  pass:true, wasmBytes:bytes.length,
  soloA:{mainNonzero:countNonzero(a.main),aux0Hash:hashFloats(a.aux[0])},
  soloB:{mainNonzero:countNonzero(b.main),aux1Hash:hashFloats(b.aux[1])},
  overlap:{mainNonzero:countNonzero(both.main),aux0Hash:hashFloats(both.aux[0]),aux1Hash:hashFloats(both.aux[1])},
  auxIsolation:true
}));
