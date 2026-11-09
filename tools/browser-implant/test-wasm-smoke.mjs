import fs from 'node:fs';

const wasmPath = new URL('./build-wasm/xensonar-c11.wasm', import.meta.url);
const bytes = fs.readFileSync(wasmPath);
const imports = { env: { exp: Math.exp, cos: Math.cos, sin: Math.sin, pow: Math.pow } };
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const DIRECT_394_FNV32 = '79068a3c';

function fnvFloat32(hash, value, scratchF32, scratchU32) {
  scratchF32[0] = value;
  const u = scratchU32[0] >>> 0;
  for (let k = 0; k < 4; k++) {
    hash ^= (u >>> (k * 8)) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

async function instantiate() {
  return (await WebAssembly.instantiate(bytes, imports)).instance.exports;
}

function directRecord(ex, epoch, frame, token = 101) {
  const ptr = ex.xen_wasm_record_scratch_ptr() >>> 0;
  const rec = new Uint32Array(ex.memory.buffer, ptr, 64);
  const f32 = new Float32Array(ex.memory.buffer, ptr, 64);
  rec.fill(0);
  rec[0] = 1 | (1 << 8); // kind=1, protocol=1
  rec[1] = token >>> 0;
  rec[2] = epoch >>> 0;
  const bi = BigInt(frame);
  rec[3] = Number(bi & 0xffffffffn) >>> 0;
  rec[4] = Number((bi >> 32n) & 0xffffffffn) >>> 0;
  rec[5] = 1;
  rec[6] = token >>> 0;
  const b = 8;
  f32[b + 0] = 440;
  f32[b + 1] = 0.08;
  f32[b + 2] = 12000;
  f32[b + 3] = 0.1;
  rec[b + 4] = 0;
  rec[b + 5] = 2400;
  rec[b + 6] = 0;
  return { ptr, rec, f32 };
}

function entrophonRecord(ex, epoch, frame, token = 201, auxMask = 0b000101) {
  const ptr = ex.xen_wasm_record_scratch_ptr() >>> 0;
  const rec = new Uint32Array(ex.memory.buffer, ptr, 64);
  const f32 = new Float32Array(ex.memory.buffer, ptr, 64);
  rec.fill(0);
  rec[0] = 2 | (1 << 8); // kind=2, protocol=1
  rec[1] = token >>> 0;
  rec[2] = epoch >>> 0;
  const bi = BigInt(frame);
  rec[3] = Number(bi & 0xffffffffn) >>> 0;
  rec[4] = Number((bi >> 32n) & 0xffffffffn) >>> 0;
  rec[5] = 2; // base count
  rec[6] = 1; // color count
  rec[7] = 2 | (0 << 8); // sawtooth + lowpass
  f32[8] = 220;
  f32[9] = 220.8;
  f32[14] = 440;
  f32[17] = 0.08;
  f32[20] = 0.09; // peak
  f32[21] = 0.035; // sustain
  rec[22] = 96;
  rec[23] = 480;
  rec[24] = 2200;
  rec[25] = 1200;
  rec[26] = 3800;
  f32[27] = Math.pow(2, 0.42 / 12);
  rec[28] = 4320;
  f32[29] = 2600;
  f32[30] = 4930;
  f32[31] = 1612;
  rec[32] = 144;
  rec[33] = 3840;
  f32[34] = 4.8;
  f32[35] = 0.7656;
  f32[36] = 6.0;
  f32[37] = 330;
  f32[38] = 3.2;
  f32[39] = 0.13;
  rec[40] = 6000;
  f32[41] = 0.0288;
  f32[42] = 0.0684;
  f32[43] = 1 / (3 * 0.7);
  rec[44] = auxMask >>> 0;
  rec[45] = token >>> 0;
  return { ptr, rec, f32 };
}

async function testDirectRegression() {
  const ex = await instantiate();
  must(ex.xen_wasm_init_profile(48000, 0) === 0, 'direct profile init');
  const epoch = ex.xen_wasm_epoch() >>> 0;
  const { ptr } = directRecord(ex, epoch, 256, 101);
  must(ex.xen_wasm_submit_record(ptr, 64) === 0, 'direct kind-1 submit');

  const scratch = new ArrayBuffer(4);
  const sf = new Float32Array(scratch);
  const su = new Uint32Array(scratch);
  let hash = 0x811c9dc5 >>> 0;
  let nonzero = 0;
  let peak = 0;
  const max = ex.xen_wasm_max_render_frames() >>> 0;
  const lp = ex.xen_wasm_output_l_ptr() >>> 0;
  const rp = ex.xen_wasm_output_r_ptr() >>> 0;
  for (let rendered = 0; rendered < 8192; ) {
    const n = Math.min(max, 8192 - rendered);
    must(ex.xen_wasm_render(n) === 0, 'direct render');
    const l = new Float32Array(ex.memory.buffer, lp, n);
    const r = new Float32Array(ex.memory.buffer, rp, n);
    for (let i = 0; i < n; i++) {
      for (const x of [l[i], r[i]]) {
        if (Number.isFinite(x) && Math.abs(x) > 1e-8) nonzero++;
        peak = Math.max(peak, Math.abs(x));
        hash = fnvFloat32(hash, x, sf, su);
      }
    }
    rendered += n;
  }
  const sig = hash.toString(16).padStart(8, '0');
  must(nonzero > 0, 'direct nonzero PCM');
  must(sig === DIRECT_394_FNV32, `Direct-Synth regression: expected ${DIRECT_394_FNV32}, got ${sig}`);

  // Profile isolation: Entrophon records cannot accidentally render through Direct host.
  const wrong = entrophonRecord(ex, epoch, 9000, 102);
  must(ex.xen_wasm_submit_record(wrong.ptr, 64) !== 0, 'direct profile must reject kind-2');
  ex.xen_wasm_destroy();
  return { hash: sig, nonzero, peak };
}

async function testEntrophon() {
  const ex = await instantiate();
  must(ex.xen_wasm_init_profile(48000, 1) === 0, 'entrophon profile init');
  const epoch = ex.xen_wasm_epoch() >>> 0;
  const { ptr, rec } = entrophonRecord(ex, epoch, 256, 201, 0b000101);
  must(ex.xen_wasm_submit_record(ptr, 64) === 0, 'entrophon kind-2 submit');

  let mainNonzero = 0;
  const auxNonzero = [0, 0, 0, 0, 0, 0];
  let mainPeak = 0;
  const max = ex.xen_wasm_max_render_frames() >>> 0;
  const lp = ex.xen_wasm_output_l_ptr() >>> 0;
  for (let rendered = 0; rendered < 8192; ) {
    const n = Math.min(max, 8192 - rendered);
    must(ex.xen_wasm_render(n) === 0, 'entrophon render');
    const l = new Float32Array(ex.memory.buffer, lp, n);
    const aux = Array.from({ length: 6 }, (_, route) => {
      const p = ex.xen_wasm_output_aux_ptr(route) >>> 0;
      must(p > 0, `aux ptr ${route}`);
      return new Float32Array(ex.memory.buffer, p, n);
    });
    for (let i = 0; i < n; i++) {
      const x = l[i];
      if (Number.isFinite(x) && Math.abs(x) > 1e-8) mainNonzero++;
      mainPeak = Math.max(mainPeak, Math.abs(x));
      for (let route = 0; route < 6; route++) {
        if (Number.isFinite(aux[route][i]) && Math.abs(aux[route][i]) > 1e-8) auxNonzero[route]++;
      }
    }
    rendered += n;
  }
  must(mainNonzero > 0, 'Entrophon nonzero main PCM');
  must(auxNonzero[0] > 0 && auxNonzero[2] > 0, 'selected Entrophon aux routes must carry PCM');
  must(auxNonzero[1] === 0 && auxNonzero[3] === 0 && auxNonzero[4] === 0 && auxNonzero[5] === 0,
    `unselected Entrophon aux route leakage: ${auxNonzero.join(',')}`);

  // Profile isolation in the opposite direction.
  const wrong = directRecord(ex, epoch, 9000, 202);
  must(ex.xen_wasm_submit_record(wrong.ptr, 64) !== 0, 'entrophon profile must reject kind-1');

  // Malformed plan must fail closed.
  entrophonRecord(ex, epoch, 9000, 203, 1);
  rec[5] = 7; // > ENTROPHON_BASE_MAX
  must(ex.xen_wasm_submit_record(ptr, 64) !== 0, 'invalid base count must reject');

  // Stale plan must not catch up as a burst.
  entrophonRecord(ex, epoch, 1, 204, 1);
  must(ex.xen_wasm_submit_record(ptr, 64) !== 0, 'stale Entrophon plan must reject');

  const epoch2 = ex.xen_wasm_panic() >>> 0;
  must(epoch2 === ((epoch + 1) >>> 0), 'Entrophon panic epoch increment');
  entrophonRecord(ex, epoch, 12000, 205, 1);
  must(ex.xen_wasm_submit_record(ptr, 64) !== 0, 'old epoch Entrophon must reject after panic');
  ex.xen_wasm_destroy();
  return { mainNonzero, mainPeak, auxNonzero, epoch1: epoch, epoch2 };
}

const direct = await testDirectRegression();
const entrophon = await testEntrophon();
console.log(JSON.stringify({ pass: true, wasmBytes: bytes.length, direct, entrophon }));
