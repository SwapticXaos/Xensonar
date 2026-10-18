const __waveU=new Uint32Array(64),__waveF=new Float32Array(__waveU.buffer);
function __waveValid(record){if(record.length!==64||(record[0]&255)!==3||(record[0]>>>8&255)!==1||record[5]>2||(record[7]&~0x100ff)!==0||(record[7]&255)>4||(record[44]&~255)!==0||record[26]<2||record[26]>sampleRate*120)return false;__waveU.set(record);for(let i=8;i<58;i++)if(i!==26&&i!==44&&!Number.isFinite(__waveF[i]))return false;return true}
var se=Object.defineProperty;
var ae=(o,t,e)=>t in o?se(o,t,{
enumerable:!0,configurable:!0,writable:!0,value:e}
):o[t]=e;
var s=(o,t,e)=>ae(o,typeof t!="symbol"?t+"":t,e);
var y={
META:0,TOKEN:1,EPOCH:2,FRAME_LO:3,FRAME_HI:4,TONE_COUNT:5,EVENT_ID:6,RESERVED:7,TONES:8}
,k=7,L={
FREQ_HZ:0,GAIN:1,CUTOFF_HZ:2,RESONANCE:3,DELAY_FRAMES:4,DURATION_FRAMES:5,WAVEFORM:6}
;
function B(o){
if(o.length!==64)return!1;
let t=o[y.META]>>>0;
if((t&255)!==1||(t>>>8&255)!==1)return!1;
let e=o[y.TONE_COUNT]>>>0;
return e>=1&&e<=8}
var oe=1,P=2,he=64;
var ce=6,le=3,b=8,ue=16384,u={
META:0,TOKEN:1,EPOCH:2,FRAME_LO:3,FRAME_HI:4,BASE_COUNT:5,COLOR_COUNT:6,FLAGS:7,BASE_FREQS:8,COLOR_FREQS:14,COLOR_GAINS:17,PEAK_GAIN:20,SUSTAIN_GAIN:21,ATTACK_FRAMES:22,DECAY_FRAMES:23,RELEASE_START_FRAMES:24,RELEASE_FRAMES:25,STOP_AFTER_FRAMES:26,PITCH_BEND_MUL:27,PITCH_BEND_FRAMES:28,FILTER_START_HZ:29,FILTER_PEAK_HZ:30,FILTER_END_HZ:31,FILTER_ATTACK_FRAMES:32,FILTER_DECAY_FRAMES:33,FILTER_Q:34,PRE_DRIVE_GAIN:35,DRIVE_AMOUNT:36,BODY_FREQ_HZ:37,BODY_Q:38,BODY_GAIN:39,DELAY_FRAMES:40,DELAY_WET_GAIN:41,DELAY_FEEDBACK:42,NORMALIZATION_GAIN:43,AUX_ROUTE_MASK:44,EVENT_ID:45}
;
const __entFiniteFields=[20,21,27,29,30,31,34,35,36,37,38,39,41,42,43];
function H(o){
if(o.length!==he)return!1;
let t=o[u.META]>>>0;
if((t&255)!==P||(t>>>8&255)!==oe)return!1;
let e=o[u.BASE_COUNT]>>>0,r=o[u.COLOR_COUNT]>>>0;
if(e<1||e>ce||r>le)return!1;
let n=o[u.FLAGS]>>>0;
if((n&~0x10303)!==0||(n&255)>3||(n>>>8&255)>3||(o[u.AUX_ROUTE_MASK]&-64)!==0)return!1;
__waveU.set(o);let a=__waveF;
for(let c=0;
c<e;
c++)if(!Number.isFinite(a[u.BASE_FREQS+c])||a[u.BASE_FREQS+c]<=0)return!1;
for(let c=0;
c<r;
c++)if(!Number.isFinite(a[u.COLOR_FREQS+c])||a[u.COLOR_FREQS+c]<=0||!Number.isFinite(a[u.COLOR_GAINS+c]))return!1;
for(let i=0;i<__entFiniteFields.length;i++)if(!Number.isFinite(a[__entFiniteFields[i]]))return!1;
return!(a[u.PEAK_GAIN]<=0||a[u.PITCH_BEND_MUL]<=0||a[u.FILTER_START_HZ]<=0||a[u.FILTER_Q]<=0||a[u.BODY_FREQ_HZ]<=0||a[u.BODY_Q]<=0||a[u.NORMALIZATION_GAIN]<=0||o[u.ATTACK_FRAMES]>>>0<1||o[u.RELEASE_FRAMES]>>>0<1||o[u.STOP_AFTER_FRAMES]>>>0<2||o[u.RELEASE_START_FRAMES]>>>0>=o[u.STOP_AFTER_FRAMES]>>>0||o[u.DELAY_FRAMES]>>>0>=ue)}
var v=64,W=256;
function Q(o){
if(o.length!==v)return!1;
let t=o[0]&255;
return t===1?B(o):t===P?H(o):t===3?__waveValid(o):!1}
var S=class{
constructor(t,e){
s(this,"_type");
s(this,"_capacity");
s(this,"buf");
s(this,"write_ptr");
s(this,"read_ptr");
s(this,"storage");
if(e.BYTES_PER_ELEMENT===void 0)throw TypeError("Pass a concrete typed array class as second argument");
this._type=e,this._capacity=(t.byteLength-8)/e.BYTES_PER_ELEMENT,this.buf=t,this.write_ptr=new Uint32Array(this.buf,0,1),this.read_ptr=new Uint32Array(this.buf,4,1),this.storage=new e(this.buf,8,this._capacity)}
static getStorageForCapacity(t,e){
if(!e.BYTES_PER_ELEMENT)throw TypeError("Pass in an ArrayBuffer subclass");
let r=8+(t+1)*e.BYTES_PER_ELEMENT;
return new SharedArrayBuffer(r)}
type(){
return this._type.name}
push(t,e,r=0){
let n=Atomics.load(this.read_ptr,0),a=Atomics.load(this.write_ptr,0);
if((a+1)%this._storage_capacity()===n)return 0;
let i=e!==void 0?e:t.length,c=Math.min(this._available_write(n,a),i),l=Math.min(this._storage_capacity()-a,c),p=c-l;
return this._copy(t,r,this.storage,a,l),this._copy(t,r+l,this.storage,0,p),Atomics.store(this.write_ptr,0,(a+c)%this._storage_capacity()),c}
writeCallback(t,e){
let r=Atomics.load(this.read_ptr,0),n=Atomics.load(this.write_ptr,0);
if((n+1)%this._storage_capacity()===r)return 0;
let a=Math.min(this._available_write(r,n),t),i=Math.min(this._storage_capacity()-n,a),c=a-i,l=new this._type(this.storage.buffer,8+n*this.storage.BYTES_PER_ELEMENT,i),p=new this._type(this.storage.buffer,8,c),h=e(l,p)||a;
return Atomics.store(this.write_ptr,0,(n+h)%this._storage_capacity()),h}
writeCallbackWithOffset(t,e){
let r=Atomics.load(this.read_ptr,0),n=Atomics.load(this.write_ptr,0);
if((n+1)%this._storage_capacity()===r)return 0;
let a=Math.min(this._available_write(r,n),t),i=Math.min(this._storage_capacity()-n,a),c=a-i,l=e(this.storage,n,i,0,c)||a;
return Atomics.store(this.write_ptr,0,(n+l)%this._storage_capacity()),l}
pop(t,e,r=0){
let n=Atomics.load(this.read_ptr,0),a=Atomics.load(this.write_ptr,0);
if(a===n)return 0;
let i=e!==void 0?e:t.length,c=Math.min(this._available_read(n,a),i),l=Math.min(this._storage_capacity()-n,c),p=c-l;
return this._copy(this.storage,n,t,r,l),this._copy(this.storage,0,t,r+l,p),Atomics.store(this.read_ptr,0,(n+c)%this._storage_capacity()),c}
empty(){
let t=Atomics.load(this.read_ptr,0);
return Atomics.load(this.write_ptr,0)===t}
full(){
let t=Atomics.load(this.read_ptr,0);
return(Atomics.load(this.write_ptr,0)+1)%this._storage_capacity()===t}
capacity(){
return this._capacity-1}
availableRead(){
let t=Atomics.load(this.read_ptr,0),e=Atomics.load(this.write_ptr,0);
return this._available_read(t,e)}
available_read(){
return this.availableRead()}
availableWrite(){
let t=Atomics.load(this.read_ptr,0),e=Atomics.load(this.write_ptr,0);
return this._available_write(t,e)}
available_write(){
return this.availableWrite()}
_available_read(t,e){
return(e+this._storage_capacity()-t)%this._storage_capacity()}
_available_write(t,e){
return this.capacity()-this._available_read(t,e)}
_storage_capacity(){
return this._capacity}
_copy(t,e,r,n,a){
if(!a)return;
if(e===0&&n+t.length<=this._storage_capacity()&&t.length===a){
r.set(t,n);
return}
let i=0,c=16;
for(;
i<=a-c;
i+=c)r[n+i]=t[e+i],r[n+i+1]=t[e+i+1],r[n+i+2]=t[e+i+2],r[n+i+3]=t[e+i+3],r[n+i+4]=t[e+i+4],r[n+i+5]=t[e+i+5],r[n+i+6]=t[e+i+6],r[n+i+7]=t[e+i+7],r[n+i+8]=t[e+i+8],r[n+i+9]=t[e+i+9],r[n+i+10]=t[e+i+10],r[n+i+11]=t[e+i+11],r[n+i+12]=t[e+i+12],r[n+i+13]=t[e+i+13],r[n+i+14]=t[e+i+14],r[n+i+15]=t[e+i+15];
for(;
i<a;
i++)r[n+i]=t[e+i]}
}
;
var C=class{
constructor(t,e){
this.ring=t;
this.wordsPerRecord=e;
if(t.type()!=="Uint32Array")throw new TypeError("Uint32Array ring required")}
tryPop(t){
if(t.length<this.wordsPerRecord)throw new RangeError("target too small");
return this.ring.availableRead()<this.wordsPerRecord?!1:this.ring.pop(t,this.wordsPerRecord)===this.wordsPerRecord}
get availableRecords(){
return Math.floor(this.ring.availableRead()/this.wordsPerRecord)}
}
;
var M=class{
constructor(t){
s(this,"reader");
s(this,"scratch",new Uint32Array(64));
this.reader=new C(new S(t,Uint32Array),64)}
tryPop(){
return this.reader.tryPop(this.scratch)?this.scratch:null}
get availableRecords(){
return this.reader.availableRecords}
}
;
function K(){
return{
env:{
exp:Math.exp,cos:Math.cos,sin:Math.sin,pow:Math.pow}
}
}
async function pe(o){
let t;
if(o.compiledModule instanceof WebAssembly.Module)t=new WebAssembly.Instance(o.compiledModule,K());
else if(o.wasmBytes instanceof ArrayBuffer)t=new WebAssembly.Instance(await WebAssembly.compile(o.wasmBytes),K());
else throw new Error("INIT requires compiledModule or wasmBytes");
return t.exports}
// PCM copies own no musical state. Prepared views are recreated only when
// the bridge's WebAssembly memory buffer changes, never on an ordinary block.
class __C11OutputWriter {
  constructor(left, right, aux, maxFrames) {
    this.sources = [left, right, ...aux];
    this.prefixes = Array(maxFrames + 1).fill(null);
    for (const frames of [32, 64, 128, 256, 512, 1024]) {
      if (frames > maxFrames) continue;
      this.prefixes[frames] = this.sources.map(source => source.subarray(0, frames));
    }
  }
  writeChannel(target, sourceIndex, offset, frames, prefixes) {
    if (prefixes && prefixes[sourceIndex].length === frames &&
        target.length >= offset + frames && typeof target.set === 'function') {
      target.set(prefixes[sourceIndex], offset);
    } else {
      // Unusual chunk lengths and short destinations retain the old indexed
      // write semantics, including ignored writes outside a typed array.
      const source = this.sources[sourceIndex];
      for (let i = 0; i < frames; i++) target[offset + i] = source[i];
    }
  }
  write(outputs, offset, frames, profile) {
    const prefixes = this.prefixes[frames];
    const main = outputs[0], left = main[0], right = main[1] ?? left;
    if (left !== right && left.buffer && left.buffer === right.buffer &&
        left.byteOffset < right.byteOffset + right.byteLength &&
        right.byteOffset < left.byteOffset + left.byteLength) {
      // Web Audio channels are disjoint. Preserve the old interleaving even
      // for artificial overlapping test views rather than broadening it.
      for (let i = 0; i < frames; i++) {
        left[offset + i] = this.sources[0][i];
        right[offset + i] = this.sources[1][i];
      }
    } else {
      this.writeChannel(left, 0, offset, frames, prefixes);
      // Mono main historically keeps the right sample; preserve that policy.
      this.writeChannel(right, 1, offset, frames, prefixes);
    }
    if (profile !== 1) return;
    for (let route = 0; route < 8; route++) {
      const channels = outputs[route + 1];
      if (!channels?.[0]) continue;
      const first = channels[0], second = channels[1] ?? first;
      this.writeChannel(first, route + 2, offset, frames, prefixes);
      if (second !== first) this.writeChannel(second, route + 2, offset, frames, prefixes);
    }
  }
}

async function Y(o,t){
let e=await pe(o),r=Number(o.profile)>>>0,n=typeof e.xen_wasm_init_profile=="function"?e.xen_wasm_init_profile(Math.round(t),r):r===0?e.xen_wasm_init(Math.round(t)):-1;
if(n!==0)throw new Error(`xen_wasm_init_profile failed: ${n}
`);
let a=e.xen_wasm_max_render_frames()>>>0,i=e.xen_wasm_record_scratch_ptr()>>>0,c=e.xen_wasm_output_l_ptr()>>>0,l=e.xen_wasm_output_r_ptr()>>>0,p=Array.from({
length:b}
,(f,O)=>e.xen_wasm_output_aux_ptr(O)>>>0);
if(!a||p.some(f=>!f))throw new Error("invalid C11 output buffers");
let h=e.memory.buffer,m=new Uint32Array(h,i,v),A=new Float32Array(h,c,a),d=new Float32Array(h,l,a),_=p.map(f=>new Float32Array(h,f,a)),writer=new __C11OutputWriter(A,d,_,a),R=()=>{
e.memory.buffer!==h&&(h=e.memory.buffer,m=new Uint32Array(h,i,v),A=new Float32Array(h,c,a),d=new Float32Array(h,l,a),_=p.map(f=>new Float32Array(h,f,a)),writer=new __C11OutputWriter(A,d,_,a))}
,g=f=>f.length!==v?-1:(R(),m.set(f),e.xen_wasm_submit_record(i,v)|0),F=0;
let waveReady=false,waveNoiseReady=false;
const loadNoise=samples=>{if(!(samples instanceof Float32Array)||!samples.length||samples.length>192000)return false;new Float32Array(e.memory.buffer,e.xen_wasm_wave_noise_ptr()>>>0,samples.length).set(samples);return waveNoiseReady=e.xen_wasm_wave_set_noise(samples.length)===0};
if(r===1&&o.waveBank instanceof Float32Array&&o.waveBank.length===782718&&o.waveTanh instanceof Float64Array&&o.waveTanh.length===65537){new Float64Array(e.memory.buffer,e.xen_wasm_wave_tanh_ptr()>>>0,65537).set(o.waveTanh);new Float32Array(e.memory.buffer,e.xen_wasm_wave_bank_ptr()>>>0,782718).set(o.waveBank);waveReady=e.xen_wasm_wave_set_tanh(65537)===0&&e.xen_wasm_wave_set_bank(782718)===0;if(waveReady&&o.waveNoise)loadNoise(o.waveNoise);}
return{
get waveReady(){return waveReady},get waveNoiseReady(){return waveNoiseReady},loadWaveNoise:loadNoise,memory:e.memory,maxRenderFrames:a,get epoch(){
return e.xen_wasm_epoch()>>>0}
,get renderedFrames(){
return F}
,submitRecord:g,submitTonePlan:g,panic(){
return e.xen_wasm_panic()>>>0}
,rebasePendingEntrophon(f){
return!Number.isInteger(f)||f<-2147483647||f>2147483647||typeof e.xen_wasm_rebase_entrophon_pending!="function"?-1:e.xen_wasm_rebase_entrophon_pending(f|0)|0}
,controlEntrophon(token,epoch,op,pitch,gain,ramp,releaseFrames){
return e.xen_wasm_control_entrophon(token,epoch,op,pitch,gain,ramp,releaseFrames)|0}
,render(f){
if(f<1||f>a)throw new RangeError("render frames");
let O=e.xen_wasm_render(f)|0;
if(O!==0)throw new Error(`xen_wasm_render failed: ${O}
`);
F+=f,R()}
,writeOutputs(outputs,offset,frames){R();writer.write(outputs,offset,frames,r)},outputLeft(){
return R(),A}
,outputRight(){
return R(),d}
,outputAux(f){
if(R(),!Number.isInteger(f)||f<0||f>=_.length)throw new RangeError("aux route");
return _[f]}
,destroy(){
e.xen_wasm_destroy()}
}
}
var me=128,de=256;
var E=64,V=16;
function q(o,t){
return Math.max(1,Math.floor((o===1?de:me)*48e3/t))}
function X(o){
if((o[0]&255)===3)return o[5]===1?24:o[5]===2?8:4;return(o[0]&255)===1?o[y.TONE_COUNT]*2:6+2*(o[u.BASE_COUNT]+o[u.COLOR_COUNT])+(o[u.DELAY_FRAMES]?4:0)}
function z(o){
return(o[0]&255)===1?o[y.TONE_COUNT]:1}
function Z(o){
if((o[0]&255)===2||(o[0]&255)===3)return o[u.STOP_AFTER_FRAMES];
let t=0;
for(let e=0;
e<o[y.TONE_COUNT];
e++){
let r=y.TONES+e*k;
t=Math.max(t,o[r+L.DELAY_FRAMES]+o[r+L.DURATION_FRAMES])}
return t}
// Shared by host and processor; 64 fixed slots, two occupancy words.
// Physical slot IDs and lowest-free-slot allocation remain unchanged.
var w = class {
  constructor(unitLimit, voiceLimit) {
    this.unitLimit = unitLimit;
    this.voiceLimit = voiceLimit;
    this.tokens = new Uint32Array(64);
    this.units = new Uint32Array(64);
    this.voices = new Uint32Array(64);
    this.frames = new Float64Array(64);
    this.ends = new Float64Array(64);
    this.states = new Uint8Array(64);
    this.usedUnits = 0;
    this.usedVoices = 0;
    this.count = 0;
    this.activeLo = 0;
    this.activeHi = 0;
  }
  find(token) {
    for (let word = 0; word < 2; word++) {
      let mask = word === 0 ? this.activeLo : this.activeHi;
      while (mask) {
        const slot = word * 32 + 31 - Math.clz32(mask & -mask);
        if (this.tokens[slot] === token) return slot;
        mask = (mask & (mask - 1)) >>> 0;
      }
    }
    return -1;
  }
  fits(units, voices) {
    return Number.isInteger(units) && units > 0 &&
      Number.isInteger(voices) && voices > 0 && this.count < 64 &&
      this.usedUnits + units <= this.unitLimit &&
      this.usedVoices + voices <= this.voiceLimit;
  }
  reserve(token, units, voices, frame, end = Infinity) {
    if (!token || this.find(token) >= 0 || !this.fits(units, voices)) return -1;
    const freeLo = (~this.activeLo) >>> 0;
    const free = freeLo || ((~this.activeHi) >>> 0);
    if (!free) return -1;
    const slot = (freeLo ? 0 : 32) + 31 - Math.clz32(free & -free);
    this.states[slot] = 1;
    this.tokens[slot] = token;
    this.units[slot] = units;
    this.voices[slot] = voices;
    this.frames[slot] = frame;
    this.ends[slot] = end;
    if (slot < 32) this.activeLo = (this.activeLo | (1 << slot)) >>> 0;
    else this.activeHi = (this.activeHi | (1 << (slot - 32))) >>> 0;
    this.usedUnits += units;
    this.usedVoices += voices;
    this.count++;
    return slot;
  }
  reduce(slot, units, voices) {
    if (!this.states[slot] || units > this.units[slot] || voices > this.voices[slot]) return false;
    this.usedUnits -= this.units[slot] - units;
    this.usedVoices -= this.voices[slot] - voices;
    this.units[slot] = units;
    this.voices[slot] = voices;
    return true;
  }
  release(slot) {
    if (slot < 0 || !this.states[slot]) return;
    this.usedUnits -= this.units[slot];
    this.usedVoices -= this.voices[slot];
    this.count--;
    this.states[slot] = 0;
    if (slot < 32) this.activeLo = (this.activeLo & ~(1 << slot)) >>> 0;
    else this.activeHi = (this.activeHi & ~(1 << (slot - 32))) >>> 0;
  }
  clear() {
    this.states.fill(0);
    this.usedUnits = 0;
    this.usedVoices = 0;
    this.count = 0;
    this.activeLo = 0;
    this.activeHi = 0;
  }
}

;
function $(o){
return(o[0]&65536)!==0}
var x=class{
constructor(t){
this.names=t;
s(this,"values");
this.values=new Float64Array(t.length)}
add(t,e=1){
this.values[t]+=e}
snapshot(){
return Object.fromEntries(this.names.map((t,e)=>[t,this.values[e]]))}
}
,N=class{
constructor(t){
this.upperInclusive=t;
s(this,"values");
s(this,"count",0);
s(this,"min",1/0);
s(this,"max",-1/0);
s(this,"invalid",0);
this.values=new Float64Array(t.length+1)}
observe(t){
if(!Number.isFinite(t)){
this.invalid++;
return}
this.count++,this.min=Math.min(this.min,t),this.max=Math.max(this.max,t);
let e=0;
for(;
e<this.upperInclusive.length&&t>this.upperInclusive[e];
)e++;
this.values[e]++}
snapshot(){
return{
upperInclusive:[...this.upperInclusive],counts:Array.from(this.values),count:this.count,min:this.count?this.min:null,max:this.count?this.max:null,invalid:this.invalid}
}
}
;
var J=[-1024,-256,-128,-1,0,128,256,512,1024];
var j=["inactive","stale","badRecordOrProfile","oldEpoch","reservationCapacity","portQueueFull","kernelNonzero","badBuffer"];
var ee=["contextDiscontinuity","explicitMute","explicitPanic","stop"];
var Ee=V,I=32,te=-10,re=-3,D=-1,ne=-4,ie=-2,U=class extends AudioWorkletProcessor{
constructor(e){
super(e);
s(this,"bridge",null);
s(this,"ring",null);
s(this,"ready",!1);
s(this,"muted",!0);
s(this,"initializing",!1);
s(this,"stopped",!1);
s(this,"profile",0);
s(this,"reservations",null);
s(this,"lastContextEnd",null);
s(this,"liveReservations",new Uint8Array(E));
this.heldReservations=new Uint8Array(E);this.heldReleases=new Uint8Array(E);
this.controlDirty=false;this.controlActiveLo=0;this.controlActiveHi=0;this.controlTokens=new Uint32Array(64);this.controlOps=new Uint8Array(64);
this.controlPitch=new Float32Array(64);this.controlGain=new Float32Array(64);
this.controlRamp=new Uint32Array(64);this.controlRelease=new Uint32Array(64);
s(this,"preservedLiveContextGaps",0);
s(this,"preservedExactQuantumRepeats",0);
s(this,"preservedEntrophonContextGaps",0);
s(this,"preservedEntrophonExactQuantumRepeats",0);
s(this,"entrophonContextRebases",0);
s(this,"entrophonContextStaleCancelled",0);
s(this,"entrophonContextRebaseFallbacks",0);
s(this,"entrophonContextDeclicks",0);
s(this,"entrophonContextDeclickRemaining",0);
s(this,"entrophonContextDeclickTotal",0);
s(this,"entrophonContextDeclickMainL",0);
s(this,"entrophonContextDeclickMainR",0);
s(this,"entrophonContextDeclickAux",new Float32Array(b));
s(this,"lastMainL",0);
s(this,"lastMainR",0);
s(this,"lastAux",new Float32Array(b));
s(this,"liveImmediateAccepted",0);
s(this,"portQueue",Array(I).fill(null));
s(this,"portRead",0);
s(this,"portWrite",0);
s(this,"portCount",0);
s(this,"portQueueHighWater",0);
s(this,"fenceReasons",new x(ee));
s(this,"rejectReasons",new x(j));
s(this,"kernelReturns",new x(["arg","capacity","stale","epoch","state","other"]));
s(this,"contextGaps",new N([-1024,-128,-1,0,1,127,128,256,512,1024,4096]));
s(this,"targetSlack",new N(J));
s(this,"quantumFrames",new N([0,64,128,256,512,1024]));
s(this,"callbacks",0);
s(this,"lastContextGapFrames",0);
s(this,"maxAbsContextGapFrames",0);
s(this,"lastQuantumFrames",0);
s(this,"fencedReservations",0);
s(this,"fencedStartedReservations",0);
s(this,"fencedQueuedRecords",0);
s(this,"consumed",0);
s(this,"submittedToKernel",0);
s(this,"kernelAccepted",0);
s(this,"normalEnds",0);
this.completionBatchVersion=0;
this.completionRecords=new Float64Array(192);
this.completionViews=Array(65).fill(null);
for(let count=2;count<=64;count++)this.completionViews[count]=new Float64Array(count*3);
s(this,"started",0);
let r=e.processorOptions?.tonePlanSAB;
typeof SharedArrayBuffer<"u"&&r instanceof SharedArrayBuffer&&(this.ring=new M(r)),this.port.onmessage=n=>{
this.onMessage(n.data)}
;
try{
this.port.start()}
catch{
}
}
diagnosticSnapshot(){
return{
profile:this.profile,epoch:this.bridge?.epoch??0,active:this.ready&&!this.muted,contextFrame:currentFrame,renderedFrames:this.bridge?.renderedFrames??0,callbacks:this.callbacks,fenceReasons:this.fenceReasons.snapshot(),contextGaps:this.contextGaps.snapshot(),lastContextGapFrames:this.lastContextGapFrames,maxAbsContextGapFrames:this.maxAbsContextGapFrames,lastQuantumFrames:this.lastQuantumFrames,quantumFrames:this.quantumFrames.snapshot(),preservedLiveContextGaps:this.preservedLiveContextGaps,preservedExactQuantumRepeats:this.preservedExactQuantumRepeats,preservedEntrophonContextGaps:this.preservedEntrophonContextGaps,preservedEntrophonExactQuantumRepeats:this.preservedEntrophonExactQuantumRepeats,entrophonContextRebases:this.entrophonContextRebases,entrophonContextStaleCancelled:this.entrophonContextStaleCancelled,entrophonContextRebaseFallbacks:this.entrophonContextRebaseFallbacks,entrophonContextDeclicks:this.entrophonContextDeclicks,entrophonContextDeclickRemaining:this.entrophonContextDeclickRemaining,liveImmediateAccepted:this.liveImmediateAccepted,fencedReservations:this.fencedReservations,fencedStartedReservations:this.fencedStartedReservations,fencedQueuedRecords:this.fencedQueuedRecords,consumed:this.consumed,rejectReasons:this.rejectReasons.snapshot(),kernelReturns:this.kernelReturns.snapshot(),submittedToKernel:this.submittedToKernel,kernelAccepted:this.kernelAccepted,normalEnds:this.normalEnds,started:this.started,targetSlackFrames:this.targetSlack.snapshot(),pendingPortRecords:this.portCount,portQueueHighWater:this.portQueueHighWater,reservations:this.reservations?.count??0}
}
reject(e,r){
return this.rejectReasons.add(e),r}
sessionState(){
this.port.postMessage({
type:"SESSION_STATE",epoch:this.bridge?.epoch??0,active:this.ready&&!this.muted}
)}
finishRecord(e,r,n){
let a=e[1],i=e[2];
if(r!==0&&this.profile===1)this.forgetEntrophonControl(a);
n?this.port.postMessage({
type:"HOT_BUFFER_RETURN",buffer:e.buffer,token:a,epoch:i,result:r,kernelAcceptedTotal:this.kernelAccepted,startedTotal:this.started,normalEndsTotal:this.normalEnds}
,[e.buffer]):r!==0&&this.port.postMessage({
type:"RECORD_RESULT",token:a,epoch:i,result:r,kernelAcceptedTotal:this.kernelAccepted,startedTotal:this.started,normalEndsTotal:this.normalEnds}
)}
drainPort(e){
for(;
this.portCount;
){
let r=this.popPort();
this.rejectReasons.add(3),this.finishRecord(r,e,!0)}
}
popPort(){
if(!this.portCount)return null;
let e=this.portQueue[this.portRead];
return this.portQueue[this.portRead]=null,this.portRead=(this.portRead+1)%I,this.portCount--,e}
fence(e){
this.fenceReasons.add(e),this.fencedQueuedRecords+=this.portCount;
let r=!1;
this.controlTokens.fill(0);this.controlActiveLo=0;this.controlActiveHi=0;this.controlDirty=false;this.heldReservations.fill(0);this.heldReleases.fill(0);
if(this.reservations)for(let n of this.reservations.states)n&&this.fencedReservations++,n===2&&(this.fencedStartedReservations++,r=this.profile===1);
e===0&&r&&this.armEntrophonContextDeclick(),this.bridge?.panic(),this.reservations?.clear(),this.drainPort(ne)}
armEntrophonContextDeclick(){
let e=Math.max(32,Math.round(sampleRate*.003));
this.entrophonContextDeclickTotal=e,this.entrophonContextDeclickRemaining=e,this.entrophonContextDeclickMainL=this.lastMainL,this.entrophonContextDeclickMainR=this.lastMainR;
for(let r=0;
r<b;
r++)this.entrophonContextDeclickAux[r]=this.lastAux[r];
this.entrophonContextDeclicks++}
applyEntrophonContextDeclick(e){
if(this.profile!==1||this.entrophonContextDeclickRemaining<=0||this.entrophonContextDeclickTotal<=0)return;
let r=e[0],n=r?.[0],a=r?.[1]??r?.[0];
if(!n||!a)return;
let i=this.entrophonContextDeclickTotal,c=this.entrophonContextDeclickRemaining;
for(let l=0;
l<n.length&&c>0;
l++,c--){
let p=c/i;
n[l]+=this.entrophonContextDeclickMainL*p;if(a!==n)a[l]+=this.entrophonContextDeclickMainR*p;
for(let h=0;
h<b;
h++){
let m=e[h+1],A=m?.[0],d=m?.[1]??m?.[0];
if(!A||!d)continue;
let _=this.entrophonContextDeclickAux[h]*p;
A[l]+=_;if(d!==A)d[l]+=_}
}
this.entrophonContextDeclickRemaining=c}
captureLastOutputSamples(e){
let r=e[0],n=r?.[0],a=r?.[1]??r?.[0];
n?.length&&(this.lastMainL=n[n.length-1]),a?.length&&(this.lastMainR=a[a.length-1]);
for(let i=0;
i<b;
i++){
let l=e[i+1]?.[0];
l?.length&&(this.lastAux[i]=l[l.length-1])}
}
clearUnwrittenOutputs(outputs, frames) {
  for (let output = 0; output < outputs.length; output++) {
    const channels = outputs[output];
    if (!channels) continue;
    const written = output === 0 || (this.profile === 1 && output <= 8);
    for (let channel = 0; channel < channels.length; channel++) {
      const target = channels[channel];
      if (!target) continue;
      // Without channel 0, the original Aux copy loop skips this output.
      const start = written && channel < 2 && channels[0] ? frames : 0;
      if (target.length > start) target.fill(0, start);
    }
  }
}
clearOutputRemainder(outputs, completedFrames) {
  // Render failure before a chunk leaves that chunk and the remaining block
  // silent, while earlier successfully copied chunks retain their samples.
  for (const channels of outputs) {
    if (!channels) continue;
    for (const target of channels) {
      if (target && target.length > completedFrames) target.fill(0, completedFrames);
    }
  }
}

clearOutputs(e){
for(let r of e)for(let n of r??[])n?.fill(0)}
canPreserveLiveTimeline(){
if(this.profile!==0||!this.reservations)return!1;
for(let e=0;
e<this.reservations.states.length;
e++){
let r=this.reservations.states[e];
if(r&&(r!==2||!this.liveReservations[e]))return!1}
return!0}
canPreserveStartedEntrophonTimeline(){
if(this.profile!==1||!this.reservations)return!1;
let e=!1;
for(let r=0;
r<this.reservations.states.length;
r++){
let n=this.reservations.states[r];
if(n){
if(n!==2)return!1;
e=!0}
}
return e}
tryRebaseEntrophonContext(e){
let r=this.bridge,n=this.reservations;
if(this.profile!==1||!r||!n||!Number.isInteger(e))return!1;
let a=Math.ceil(sampleRate*.05);
if(e < -a || e > 2147483647)return!1;
let i=0,c=0,l=-e;
for(let h=0;
h<n.states.length;
h++)n.states[h]===1&&(i++,n.frames[h]+l<r.renderedFrames&&c++);
if(!i)return!0;
if(r.rebasePendingEntrophon(l)!==c)return this.entrophonContextRebaseFallbacks++,!1;
for(let h=0;
h<n.states.length;
h++){
if(n.states[h]!==1)continue;
let m=n.frames[h]+l;
if(m<r.renderedFrames){
let A=n.tokens[h];
this.rejectReasons.add(1),this.entrophonContextStaleCancelled++,this.port.postMessage({
type:"RECORD_RESULT",token:A,epoch:r.epoch,result:re,kernelAcceptedTotal:this.kernelAccepted,startedTotal:this.started,normalEndsTotal:this.normalEnds}
),n.release(h);
continue}
n.frames[h]=m,n.ends[h]+=l}
return this.entrophonContextRebases++,!0}
canPreserveExactQuantumRepeat(){
if(this.profile!==0||!this.reservations||this.portCount!==0||this.ring)return!1;
let e=!1;
for(let r=0;
r<this.reservations.states.length;
r++){
let n=this.reservations.states[r];
if(n){
if(n!==2||!this.liveReservations[r])return!1;
e=!0}
}
return e}
async onMessage(e){
if(!(!e||typeof e!="object")){
if(e.type==="DIAGNOSTIC_REQUEST"){
this.port.postMessage({
type:"DIAGNOSTIC_SNAPSHOT",requestId:e.requestId,snapshot:this.diagnosticSnapshot()}
);
return}
if(e.type==="STOP"){
this.stopped=!0,this.muted=!0,this.ready=!1,this.fence(3),this.bridge?.destroy(),this.bridge=null;
return}
if(!this.stopped){
if(e.type==="INIT"){
let r=Number(e.attemptId)||0;
if(this.port.postMessage({
type:"INIT_ACK",attemptId:r,state:this.ready?"ready":this.initializing?"initializing":"idle"}
),this.ready||this.initializing)return;
this.initializing=!0;
try{
this.profile=Number(e.profile)>>>0;this.completionBatchVersion=e.completionBatchVersion===1?1:0;
let n=await Y({
...e,profile:this.profile}
,sampleRate);
if(this.stopped){
n.destroy();
return}
this.bridge=n,this.reservations=new w(q(this.profile,sampleRate),this.profile===1?32:512),this.ready=!0,this.muted=!0,this.port.postMessage({
type:"READY",sampleRate,epoch:n.epoch,transport:this.ring?"ringbuf-sab":"message-port-pool",profile:this.profile,waveReady:n.waveReady,waveNoiseReady:n.waveNoiseReady}
)}
catch(n){
this.port.postMessage({
type:"FAULT",reason:n instanceof Error?n.message:String(n),stage:"kernel-bridge-create"}
)}
finally{
this.initializing=!1}
return}
if(this.bridge){
if(e.type==="WAVE_NOISE"){this.port.postMessage({type:"WAVE_NOISE_ACK",ready:this.bridge.loadWaveNoise(e.samples)});return}
if(e.type==="ENTROPHON_CONTROL"){this.queueEntrophonControl(e);return}
if(e.type==="HOT_TONE_PLAN"){
let r=e.buffer;
if(r?.byteLength!==W){
this.rejectReasons.add(7);
return}
let n=new Uint32Array(r);
if(!this.ready||this.muted){
this.finishRecord(n,this.reject(0,te),!0);
return}
if(this.portCount===I){
this.finishRecord(n,this.reject(5,ie),!0);
return}
this.portQueue[this.portWrite]=n,this.portWrite=(this.portWrite+1)%I,this.portCount++,this.portQueueHighWater=Math.max(this.portQueueHighWater,this.portCount)}
else if(e.type==="PANIC")this.fence(2),this.port.postMessage({
type:"PANIC_DONE",epoch:this.bridge.epoch,active:!this.muted}
);
else if(e.type==="SET_MUTED"){
let r=!!e.muted;
r&&!this.muted&&this.fence(1),this.muted=r,this.sessionState()}
}
}
}
}
consume(e){
this.consumed++;
let r=this.bridge;
if(!r||!this.ready||this.muted)return this.reject(0,te);
if(!Q(e))return this.reject(2,D);
if(this.profile===1?((e[0]&255)!==2&&(e[0]&255)!==3):(e[0]&255)!==1)return this.reject(2,D);
if(e[2]!==r.epoch)return this.reject(3,ne);
if(this.profile===1&&this.heldReleaseQueued(e))return this.reject(1,re);
let n=e[3]+e[4]*4294967296,a=$(e);
if(this.targetSlack.observe(n-currentFrame),!Number.isSafeInteger(n)||(n<currentFrame&&!(a&&this.profile===1&&(e[0]&255)===3&&e[5]===2&&currentFrame-n<=256)))return this.reject(1,re);
if(a&&((this.profile!==0&&!(this.profile===1&&(e[0]&255)===3&&e[5]===2))||n-currentFrame>Math.ceil(sampleRate*20/1e3)))return this.reject(2,D);
let i=r.renderedFrames+(a?0:n-currentFrame),c=this.reservations,l=c.reserve(e[1],X(e),z(e),i,i+Z(e));
if(l<0)return this.reject(4,ie);
this.liveReservations[l]=a?1:0;this.heldReservations[l]=this.profile===1&&(e[7]&65536)?1:0;this.heldReleases[l]=0;
let p=e[3],h=e[4];
e[3]=i>>>0,e[4]=Math.floor(i/4294967296),this.submittedToKernel++;
let m=r.submitRecord(e);
return e[3]=p,e[4]=h,m!==0?(c.release(l),this.rejectReasons.add(6),this.kernelReturns.add(m<=-1&&m>=-5?-m-1:5)):(this.kernelAccepted++,a&&this.liveImmediateAccepted++),m}
// Fixed control slots, same coalescing and release precedence as before.
// The occupancy index prevents a single held voice from scanning 64 slots.
findEntrophonControl(token) {
  for (let word = 0; word < 2; word++) {
    let mask = word === 0 ? this.controlActiveLo : this.controlActiveHi;
    while (mask) {
      const slot = word * 32 + 31 - Math.clz32(mask & -mask);
      if (this.controlTokens[slot] === token) return slot;
      mask = (mask & (mask - 1)) >>> 0;
    }
  }
  return -1;
}
clearEntrophonControl(slot) {
  this.controlTokens[slot] = 0;
  if (slot < 32) this.controlActiveLo = (this.controlActiveLo & ~(1 << slot)) >>> 0;
  else this.controlActiveHi = (this.controlActiveHi & ~(1 << (slot - 32))) >>> 0;
}
queueEntrophonControl(e) {
  if (this.profile !== 1 || !this.ready || this.muted || !this.bridge || e.epoch !== this.bridge.epoch ||
      !Number.isInteger(e.token) || e.token <= 0 || e.token > 4294967295 ||
      (e.op !== 1 && e.op !== 2) || !Number.isFinite(e.pitch) || e.pitch < .125 || e.pitch > 8 ||
      !Number.isFinite(e.gain) || e.gain < 0 || e.gain > 4 || !Number.isInteger(e.ramp) || e.ramp < 0 || e.ramp > sampleRate ||
      !Number.isInteger(e.releaseFrames) || e.releaseFrames < 1 || e.releaseFrames > Math.round(sampleRate * 2.5)) return;
  let slot = this.findEntrophonControl(e.token);
  if (slot < 0) {
    const freeLo = (~this.controlActiveLo) >>> 0;
    const free = freeLo || ((~this.controlActiveHi) >>> 0);
    if (!free) return;
    slot = (freeLo ? 0 : 32) + 31 - Math.clz32(free & -free);
  }
  if (this.controlTokens[slot] === e.token && this.controlOps[slot] === 2) return;
  this.controlDirty = true;
  this.controlTokens[slot] = e.token;
  if (slot < 32) this.controlActiveLo = (this.controlActiveLo | (1 << slot)) >>> 0;
  else this.controlActiveHi = (this.controlActiveHi | (1 << (slot - 32))) >>> 0;
  this.controlOps[slot] = e.op;
  this.controlPitch[slot] = e.pitch;
  this.controlGain[slot] = e.gain;
  this.controlRamp[slot] = e.ramp;
  this.controlRelease[slot] = e.releaseFrames;
}
forgetEntrophonControl(token) {
  const slot = this.findEntrophonControl(token);
  if (slot >= 0) this.clearEntrophonControl(slot);
}
heldReleaseQueued(record) {
  if ((record[7] & 65536) === 0) return false;
  const slot = this.findEntrophonControl(record[1]);
  if (slot >= 0 && this.controlOps[slot] === 2) {
    this.clearEntrophonControl(slot);
    return true;
  }
  return false;
}
applyEntrophonControls() {
  if (this.profile !== 1 || !this.controlDirty) return;
  let pending = false;
  const res = this.reservations;
  for (let word = 0; word < 2; word++) {
    let mask = word === 0 ? this.controlActiveLo : this.controlActiveHi;
    while (mask) {
      const i = word * 32 + 31 - Math.clz32(mask & -mask);
      mask = (mask & (mask - 1)) >>> 0;
      const token = this.controlTokens[i];
      const slot = res.find(token);
      if (slot < 0) {
        if (!this.portCount && (!this.ring || !this.ring.availableRecords)) this.clearEntrophonControl(i);
        else pending = true;
        continue;
      }
      this.clearEntrophonControl(i);
      if (!this.heldReservations[slot] || this.heldReleases[slot]) continue;
      const op = this.controlOps[i], frames = this.controlRelease[i];
      const result = this.bridge.controlEntrophon(token, this.bridge.epoch, op,
        this.controlPitch[i], this.controlGain[i], this.controlRamp[i], frames);
      if (result < 0) { this.fence(2); this.sessionState(); return; }
      if (op === 2) {
        this.heldReleases[slot] = 1;
        if (result === 1) {
          this.normalEnds++;
          this.port.postMessage({type: 'RECORD_ENDED', token, epoch: this.bridge.epoch,
            kernelAcceptedTotal: this.kernelAccepted, startedTotal: this.started, normalEndsTotal: this.normalEnds});
          res.release(slot);
        } else res.ends[slot] = this.bridge.renderedFrames + frames + Math.floor(sampleRate * .04);
      }
    }
  }
  this.controlDirty = pending;
}

// Called once after the existing render and declick paths. Ascending fixed
// slot order preserves the old ordering and per-event cumulative totals.
accountRenderedReservations() {
  const pool = this.reservations;
  if (!pool.count) return;
  let endedCount = 0;
  for (let word = 0; word < 2; word++) {
    let mask = word === 0 ? pool.activeLo : pool.activeHi;
    while (mask) {
      const slot = word * 32 + 31 - Math.clz32(mask & -mask);
      mask = (mask & (mask - 1)) >>> 0;
      if (pool.states[slot] === 1 && this.bridge.renderedFrames > pool.frames[slot]) {
        pool.states[slot] = 2;
        this.started++;
      }
      if (this.bridge.renderedFrames >= pool.ends[slot]) {
        this.normalEnds++;
        if (this.completionBatchVersion === 1) {
          const offset = endedCount * 3;
          this.completionRecords[offset] = pool.tokens[slot];
          this.completionRecords[offset + 1] = this.started;
          this.completionRecords[offset + 2] = this.normalEnds;
          endedCount++;
        } else {
          this.port.postMessage({type: 'RECORD_ENDED', token: pool.tokens[slot],
            epoch: this.bridge.epoch, kernelAcceptedTotal: this.kernelAccepted,
            startedTotal: this.started, normalEndsTotal: this.normalEnds});
        }
        pool.release(slot);
      }
    }
  }
  // Structured clone snapshots the reusable storage; it is never transferred.
  // No timer, additional quantum, queue, or asynchronous flush is introduced.
  if (endedCount === 1) {
    this.port.postMessage({type: 'RECORD_ENDED', token: this.completionRecords[0],
      epoch: this.bridge.epoch, kernelAcceptedTotal: this.kernelAccepted,
      startedTotal: this.completionRecords[1], normalEndsTotal: this.completionRecords[2]});
  } else if (endedCount > 1) {
    const records = this.completionViews[endedCount];
    for (let i = 0; i < endedCount * 3; i++) records[i] = this.completionRecords[i];
    this.port.postMessage({type: 'RECORDS_ENDED', version: 1,
      epoch: this.bridge.epoch, kernelAcceptedTotal: this.kernelAccepted,
      records});
  }
}

process(e,r){
let n=r[0];
if(!n?.[0])return!this.stopped;
let a=n[0],i=n[1]??n[0],c=this.lastQuantumFrames;
if(this.callbacks++,this.lastQuantumFrames=a.length,this.quantumFrames.observe(a.length),!this.ready||!this.bridge){this.clearOutputs(r);return!this.stopped;}
const fastOutputs=typeof this.bridge.writeOutputs==="function";
if(!fastOutputs)this.clearOutputs(r);
let completedFrames=0;
try{
if(this.lastContextEnd!==null&&currentFrame!==this.lastContextEnd){
let h=currentFrame-this.lastContextEnd;
this.lastContextGapFrames=h,this.maxAbsContextGapFrames=Math.max(this.maxAbsContextGapFrames,Math.abs(h)),this.contextGaps.observe(h);
let m=c>0&&a.length===c&&h===-c;
h>0&&this.canPreserveLiveTimeline()?this.preservedLiveContextGaps++:this.profile===1&&this.tryRebaseEntrophonContext(h)?h>0&&this.canPreserveStartedEntrophonTimeline()?this.preservedEntrophonContextGaps++:m&&this.canPreserveStartedEntrophonTimeline()&&this.preservedEntrophonExactQuantumRepeats++:m&&this.canPreserveExactQuantumRepeat()?this.preservedExactQuantumRepeats++:(this.fence(0),this.sessionState())}
this.lastContextEnd=currentFrame+a.length;
for(let h=0;
h<Ee;
h++){
let m=this.ring?this.ring.tryPop():this.popPort();
if(!m)break;
this.finishRecord(m,this.consume(m),!this.ring)}
if(this.profile===1)this.applyEntrophonControls();
if(this.muted){if(fastOutputs)this.clearOutputs(r);return!0;}
if(fastOutputs)this.clearUnwrittenOutputs(r,a.length);
let l=0;
for(;
l<a.length;
){
let h=Math.min(a.length-l,this.bridge.maxRenderFrames);
this.bridge.render(h);
if(fastOutputs)this.bridge.writeOutputs(r,l,h);else{
let m=this.bridge.outputLeft(),A=this.bridge.outputRight();
for(let d=0;
d<h;
d++)a[l+d]=m[d],i[l+d]=A[d];
if(this.profile===1)for(let d=0;
d<b;
d++){
let _=r[d+1];
if(!_?.[0])continue;
let R=this.bridge.outputAux(d),g=_[0],F=_[1]??_[0];
for(let f=0;
f<h;
f++)g[l+f]=R[f];
if(F!==g)for(let f=0;
f<h;
f++)F[l+f]=R[f]}
}
l+=h;completedFrames=l;}
if(this.profile===1){this.applyEntrophonContextDeclick(r);this.captureLastOutputSamples(r)}
this.accountRenderedReservations();
return!0;
}catch(error){if(fastOutputs)this.clearOutputRemainder(r,completedFrames);throw error;}
}
}
;
registerProcessor("xensonar-c11-host",U);

