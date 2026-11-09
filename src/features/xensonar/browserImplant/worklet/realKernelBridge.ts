import type { RealKernelBridge } from "./kernelBridgeContract";
import { BROWSER_C11_RECORD_WORDS } from "../protocol/browserC11Record";
import { ENTROPHON_AUX_MAX } from "../protocol/entrophonVoiceRecord";

type XenWasmExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  xen_wasm_init(sampleRate: number): number;
  xen_wasm_init_profile(sampleRate: number, profile: number): number;
  xen_wasm_destroy(): void;
  xen_wasm_epoch(): number;
  xen_wasm_panic(): number;
  xen_wasm_submit_record(ptr: number, words: number): number;
  xen_wasm_submit_tone_record(ptr: number, words: number): number;
  xen_wasm_record_scratch_ptr(): number;
  xen_wasm_output_l_ptr(): number;
  xen_wasm_output_r_ptr(): number;
  xen_wasm_output_aux_ptr(route: number): number;
  xen_wasm_max_render_frames(): number;
  xen_wasm_render(frames: number): number;
};

export type KernelInitPayload = {
  compiledModule?: WebAssembly.Module;
  wasmBytes?: ArrayBuffer;
  profile?: number;
};

function imports(): WebAssembly.Imports {
  return { env: { exp: Math.exp, cos: Math.cos, sin: Math.sin, pow: Math.pow } };
}

async function instantiate(payload: KernelInitPayload): Promise<XenWasmExports> {
  let instance: WebAssembly.Instance;
  if (payload.compiledModule instanceof WebAssembly.Module) instance = new WebAssembly.Instance(payload.compiledModule, imports());
  else if (payload.wasmBytes instanceof ArrayBuffer) instance = new WebAssembly.Instance(await WebAssembly.compile(payload.wasmBytes), imports());
  else throw new Error("INIT requires compiledModule or wasmBytes");
  return instance.exports as XenWasmExports;
}

export async function createRealKernelBridge(payload: KernelInitPayload, sampleRate: number): Promise<RealKernelBridge> {
  const ex = await instantiate(payload);
  const profile = Number(payload.profile) >>> 0;
  const rc = typeof ex.xen_wasm_init_profile === "function"
    ? ex.xen_wasm_init_profile(Math.round(sampleRate), profile)
    : profile === 0 ? ex.xen_wasm_init(Math.round(sampleRate)) : -1;
  if (rc !== 0) throw new Error(`xen_wasm_init_profile failed: ${rc}`);

  const maxRenderFrames = ex.xen_wasm_max_render_frames() >>> 0;
  const recordPtr = ex.xen_wasm_record_scratch_ptr() >>> 0;
  const leftPtr = ex.xen_wasm_output_l_ptr() >>> 0;
  const rightPtr = ex.xen_wasm_output_r_ptr() >>> 0;
  const auxPtrs = Array.from({ length: ENTROPHON_AUX_MAX }, (_, route) => ex.xen_wasm_output_aux_ptr(route) >>> 0);
  if (!maxRenderFrames || auxPtrs.some(ptr => !ptr)) throw new Error("invalid C11 output buffers");

  let memBuffer = ex.memory.buffer;
  let recordScratch = new Uint32Array(memBuffer, recordPtr, BROWSER_C11_RECORD_WORDS);
  let outL = new Float32Array(memBuffer, leftPtr, maxRenderFrames);
  let outR = new Float32Array(memBuffer, rightPtr, maxRenderFrames);
  let aux = auxPtrs.map(ptr => new Float32Array(memBuffer, ptr, maxRenderFrames));
  const refreshViews = () => {
    if (ex.memory.buffer === memBuffer) return;
    memBuffer = ex.memory.buffer;
    recordScratch = new Uint32Array(memBuffer, recordPtr, BROWSER_C11_RECORD_WORDS);
    outL = new Float32Array(memBuffer, leftPtr, maxRenderFrames);
    outR = new Float32Array(memBuffer, rightPtr, maxRenderFrames);
    aux = auxPtrs.map(ptr => new Float32Array(memBuffer, ptr, maxRenderFrames));
  };
  const submit = (record: Uint32Array): number => {
    if (record.length !== BROWSER_C11_RECORD_WORDS) return -1;
    refreshViews(); recordScratch.set(record);
    return ex.xen_wasm_submit_record(recordPtr, BROWSER_C11_RECORD_WORDS) | 0;
  };
  let renderedFrames = 0;

  return {
    memory: ex.memory,
    maxRenderFrames,
    get epoch() { return ex.xen_wasm_epoch() >>> 0; },
    get renderedFrames() { return renderedFrames; },
    submitRecord: submit,
    submitTonePlan: submit,
    panic(): number { return ex.xen_wasm_panic() >>> 0; },
    render(frames: number): void {
      if (frames < 1 || frames > maxRenderFrames) throw new RangeError("render frames");
      const r = ex.xen_wasm_render(frames) | 0;
      if (r !== 0) throw new Error(`xen_wasm_render failed: ${r}`);
      renderedFrames += frames;
      refreshViews();
    },
    outputLeft(): Float32Array { refreshViews(); return outL; },
    outputRight(): Float32Array { refreshViews(); return outR; },
    outputAux(route: number): Float32Array {
      refreshViews();
      if (!Number.isInteger(route) || route < 0 || route >= aux.length) throw new RangeError("aux route");
      return aux[route];
    },
    destroy(): void { ex.xen_wasm_destroy(); },
  };
}
