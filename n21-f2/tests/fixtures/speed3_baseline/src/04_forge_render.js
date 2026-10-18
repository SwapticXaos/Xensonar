
/* One recipe and one revision own the complete offline result. No live-audio work. */
// One hybrid recipe owner; storage is accessed lazily inside protected reads/writes.
var __F352Session=__createF352Session(__F352Recipe,{read:key=>localStorage.getItem(key),write:(key,value)=>localStorage.setItem(key,value)});
// Migration seam for F3.51 experiment files; there is no second state store.
var __F351Combination=__F352Session;

/* Pure orchestration: adapters consume a frozen job; no store or engine reads inside a render. */
function __f352CreatePipeline(adapters,{maxBytes=96*1024*1024}={}){
 const cache=new Map(),artifacts=new Map(),listeners=new Set();let bytes=0,artifactBytes=0,epoch=0,active=null,result=null;
 let status=Object.freeze({phase:'idle',stage:'',progress:0,error:'',result:null});
 const stats={donorRenders:0,syntheticRenders:0,combinations:0,cacheHits:0};
 function publish(fields){status=Object.freeze({...status,...fields,result});for(const f of listeners)f();}
 const check=t=>{if(t!==epoch)throw new DOMException("Rendering cancelled or superseded by a newer state.",'AbortError');};
 function materialBytes(material){return (material?.runs??[]).reduce((n,r)=>n+1024+(r.states?.length??0)*512+(r.gestalt?.sourceCurve?.byteLength??0)+(r.gestalt?.widthCurve?.byteLength??0),0);}
 function size(v){return (v?.pcm?.byteLength??0)+materialBytes(v?.material);}
 function put(key,value){const count=size(value);if(count>maxBytes)return value;const old=cache.get(key);if(old)bytes-=size(old);cache.delete(key);cache.set(key,value);bytes+=count;while(bytes>maxBytes&&cache.size){const first=cache.keys().next().value;bytes-=size(cache.get(first));cache.delete(first);}return value;}
 function get(key){const value=cache.get(key);if(value){cache.delete(key);cache.set(key,value);stats.cacheHits++;}return value;}
 function remember(artifact){
  const buffers=new Set([artifact.pcm.buffer,artifact.stems.donor?.buffer,artifact.stems.synthetic?.buffer,artifact.spectrum?.values?.buffer].filter(Boolean));
  const size=[...buffers].reduce((n,b)=>n+b.byteLength,0)+materialBytes(artifact.material);
  const budget=Math.min(maxBytes,48*1024*1024);if(size>budget)return;
  const old=artifacts.get(artifact.key);if(old)artifactBytes-=old.size;
  artifacts.delete(artifact.key);artifacts.set(artifact.key,{artifact,size});artifactBytes+=size;
  while(artifactBytes>budget||artifacts.size>8){const k=artifacts.keys().next().value;artifactBytes-=artifacts.get(k).size;artifacts.delete(k);}
 }
 async function stage(key,name,run,t,start,end){check(t);const hit=get(key);if(hit){publish({stage:name,progress:end});return hit;}publish({stage:name,progress:start});
  const value=await run({isCancelled:()=>t!==epoch,onProgress:p=>{if(t===epoch)publish({stage:name,progress:start+Math.max(0,Math.min(1,p))*(end-start)});}});check(t);return put(key,value);
 }
 async function execute(job,t){try{
  publish({phase:'rendering',stage:'Carrier vorbereiten',progress:0,error:''});
  const donor=await stage('d:'+job.donorKey,"Donor Sound Body",async o=>{stats.donorRenders++;return adapters.donor(job,o);},t,0,.44);
  let synthetic=null,combined=donor;
  if(job.recipe.amount>0){
   synthetic=await stage('s:'+job.syntheticKey,"Cecilia Sound Body",async o=>{stats.syntheticRenders++;return adapters.synthetic(job,donor,o);},t,.44,.77);
   combined=await stage('m:'+job.key,'Klangkombination',async o=>{stats.combinations++;return adapters.combine(job,donor,synthetic,o);},t,.77,.95);
  }
  check(t);const artifact={key:job.key,pcm:combined.pcm,sampleRate:job.sampleRate,durationSec:combined.pcm.length/job.sampleRate,
   material:donor.material,recipe:job.recipe,manifest:job.manifest,metrics:combined.metrics??{},stems:{donor:donor.pcm,synthetic:synthetic?.pcm??null},buffer:null,spectrum:null};
  publish({stage:'Ergebnisdarstellung',progress:.95});
  artifact.buffer=adapters.buffer(artifact.pcm,job.sampleRate);
  artifact.spectrum=await adapters.spectrum(artifact.pcm,job.sampleRate,()=>t!==epoch,job);check(t);
  result=Object.freeze(artifact);remember(result);publish({phase:'ready',stage:'Ergebnis bereit',progress:1});return result;
 }catch(e){if(t===epoch)publish({phase:e.name==='AbortError'?'idle':'error',stage:'',progress:0,error:e.name==='AbortError'?'':String(e.message??e)});throw e;}}
 function render(job){
  const hit=artifacts.get(job.key);
  if(result?.key===job.key||hit){
   // A cached result can replace an in-flight render regardless of its key.
   // Preserve active as predecessor until it settles: no overlapping heavy renders.
   if(active?.ticket===epoch)epoch++;
   if(hit){artifacts.delete(job.key);artifacts.set(job.key,hit);result=hit.artifact;stats.cacheHits++;}
   publish({phase:'ready',stage:'Gespeichertes Ergebnis bereit',progress:1,error:''});
   return Promise.resolve(result);
  }
  // Same-key deduplication is only valid inside the SAME live epoch.
  // invalidate() and a cache activation retire the previous ticket.
  if(active?.key===job.key&&active.ticket===epoch)return active.promise;
  const t=++epoch;
  // Serialize replacements, even when active has already been invalidated.
  const predecessor=active?.promise;
  const promise=(async()=>{if(predecessor)try{await predecessor;}catch{}check(t);return execute(job,t);})();
  active={key:job.key,promise,ticket:t};
  promise.then(()=>{if(active?.promise===promise)active=null;},()=>{if(active?.promise===promise)active=null;});
  return promise;
 }
 function invalidate(){epoch++;publish({phase:result?'stale':'idle',stage:'',progress:0,error:''});}
 return Object.freeze({render,invalidate,getSnapshot:()=>status,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},diagnostics:()=>({...stats,cacheBytes:bytes,cacheEntries:cache.size,artifactBytes,artifactEntries:artifacts.size,maxBytes})});
}


/* Combination DSP keeps donor PCM intact; only the synthetic stem is spectrally shaped. */
function __f347CeciliaDSPFactory(){
    const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
    const yieldTask = () => new Promise(r => setTimeout(r, 0));
    const check = o => { if (o?.isCancelled?.())
        throw new DOMException('Klangberechnung abgebrochen.', 'AbortError'); };
    function fft(re, im, inverse = false) { const n = re.length; for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1)
            j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    } for (let s = 2; s <= n; s *= 2) {
        const a = (inverse ? 2 : -2) * Math.PI / s, cs = Math.cos(a), sn = Math.sin(a);
        for (let from = 0; from < n; from += s) {
            let wr = 1, wi = 0;
            for (let k = 0; k < s / 2; k++) {
                const x = from + k, y = x + s / 2, tr = re[y] * wr - im[y] * wi, ti = re[y] * wi + im[y] * wr;
                re[y] = re[x] - tr;
                im[y] = im[x] - ti;
                re[x] += tr;
                im[x] += ti;
                const tmp = wr * cs - wi * sn;
                wi = wr * sn + wi * cs;
                wr = tmp;
            }
        }
    } if (inverse)
        for (let k = 0; k < n; k++) {
            re[k] /= n;
            im[k] /= n;
        } }
    async function complement(donor, synth, sr, strength, options) {
        if (strength === 0)
            return synth;
        const n = 2048, hop = 512, bands = 24, window = Float64Array.from({ length: n }, (_, i) => Math.sin(Math.PI * (i + .5) / n));
        const out = new Float32Array(synth.length), weights = new Float32Array(synth.length), dr = new Float64Array(n), di = new Float64Array(n), re = new Float64Array(n), im = new Float64Array(n), smooth = new Float64Array(bands).fill(1), bins = Int16Array.from({ length: n / 2 + 1 }, (_, k) => clamp(Math.floor(Math.log(Math.max(40, k * sr / n) / 40) / Math.log(sr * .5 / 40) * bands), 0, bands - 1));
        let frames = 0;
        for (let start = -n + hop; start < synth.length; start += hop) {
            check(options);
            dr.fill(0);
            di.fill(0);
            re.fill(0);
            im.fill(0);
            for (let j = 0; j < n; j++) {
                const at = start + j;
                if (at >= 0 && at < synth.length) {
                    dr[j] = donor[at] * window[j];
                    re[j] = synth[at] * window[j];
                }
            }
            fft(dr, di);
            fft(re, im);
            const de = new Float64Array(bands), se = new Float64Array(bands);
            for (let k = 1; k <= n / 2; k++) {
                de[bins[k]] += dr[k] ** 2 + di[k] ** 2;
                se[bins[k]] += re[k] ** 2 + im[k] ** 2;
            }
            for (let b = 0; b < bands; b++) {
                let d = de[b] * 2, s = se[b] * 2;
                if (b) {
                    d += de[b - 1];
                    s += se[b - 1];
                }
                if (b + 1 < bands) {
                    d += de[b + 1];
                    s += se[b + 1];
                }
                const target = 1 - strength * .75 * d / (d + s + 1e-18);
                smooth[b] += (target<smooth[b]?.55:.12) * (target - smooth[b]);
            }
            for (let k = 0; k <= n / 2; k++) {
                const b = bins[k], gain = (smooth[Math.max(0, b - 1)] + smooth[b] * 2 + smooth[Math.min(bands - 1, b + 1)]) / 4;
                re[k] *= gain;
                im[k] *= gain;
                if (k && k < n / 2) {
                    re[n - k] *= gain;
                    im[n - k] *= gain;
                }
            }
            fft(re, im, true);
            for (let j = 0; j < n; j++) {
                const at = start + j;
                if (at >= 0 && at < out.length) {
                    out[at] += re[j] * window[j];
                    weights[at] += window[j] ** 2;
                }
            }
            if (++frames % 8 === 0) {
                options.onProgress?.(.7 * (start + n) / Math.max(1, synth.length + n));
                await yieldTask();
            }
        }
        for (let i = 0; i < out.length; i++)
            out[i] /= Math.max(1e-9, weights[i]);
        return out;
    }
    async function combine(job, donor, synthetic, options = {}) {
        const { amount, mode, color } = job.recipe, d = donor.pcm, raw = synthetic.pcm;
        if (d.length !== raw.length)
            throw Error("Sound sources have different timelines.");
        let s = mode === 'spectral' ? await complement(d, raw, job.sampleRate, color, options) : raw;
        // A broad spectral process may spread energy across an edge. Restore exact carrier support.
        if (s !== raw) {
            for (let i = 0; i < s.length; i++)
                if (!job.support.activeAt(i, s.length))
                    s[i] = 0;
        }
        const out = new Float32Array(d.length), gd = Math.cos(amount * Math.PI / 2), gs = Math.sin(amount * Math.PI / 2);
        let ed = 0, es = 0, em = 0, correlation = 0, peak = 0;
        for (let i = 0; i < out.length; i++) {
            const value = amount === 1 ? s[i] : d[i] * gd + s[i] * gs;
            if (!Number.isFinite(value))
                throw Error("Non-finite sound value.");
            out[i] = value;
            ed += d[i] ** 2;
            es += s[i] ** 2;
            correlation += d[i]*s[i];
            em += value ** 2;
            peak = Math.max(peak, Math.abs(value));
            if (i % 65536 === 65535) {
                check(options);
                await yieldTask();
            }
        }
        const target = gd*gd*ed + gs*gs*es;
        const scale = amount===0||amount===1?Math.min(1,peak>.9?.9/peak:1):Math.min(1.35, em > 1e-20 ? Math.sqrt(target / em) : 1, peak > .9 ? .9 / peak : 1);
        if (scale !== 1)
            for (let i = 0; i < out.length; i++) {
                out[i] *= scale;
                if (i % 65536 === 65535) {
                    check(options);
                    await yieldTask();
                }
            }
        check(options);
        options.onProgress?.(1);
        return { pcm: out, metrics: { peak: peak * scale, gainCompensation: scale, stemCorrelation:correlation/Math.max(1e-20,Math.sqrt(ed*es)), donorRms: Math.sqrt(ed / out.length), syntheticRms: Math.sqrt(es / out.length), resultRms: Math.sqrt(em / out.length) * scale, revision:41, spectralStrength: mode === 'spectral' ? color : 0 } };
    }
    async function spectrum(samples, sampleRate, options = {}) {
        const width = Math.max(64, Math.min(360, Math.ceil(samples.length / sampleRate * 55))), height = 150, size = 2048, values = new Float32Array(width * height), re = new Float64Array(size), im = new Float64Array(size);
        // Image rows and cosine taper depend only on sample rate / FFT geometry,
        // not on the individual spectrum column. Keep identical formulas and summation order.
        const spectrumWindow = Float64Array.from({length:size}, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
        const spectrumRows = Array.from({length:height}, (_, y) => {
            const high = 35 * (sampleRate * .46 / 35) ** (1 - y / height), low = 35 * (sampleRate * .46 / 35) ** (1 - (y + 1) / height), a = Math.max(1, Math.floor(low / sampleRate * size)), b = Math.min(size / 2, Math.max(a, Math.ceil(high / sampleRate * size)));
            return [a, b];
        });
        let maximum = 0;
        for (let x = 0; x < width; x++) {
            check(options);
            const center = Math.round((x + .5) / width * samples.length);
            im.fill(0);
            for (let i = 0; i < size; i++)
                re[i] = (samples[center + i - size / 2] ?? 0) * spectrumWindow[i];
            fft(re, im);
            for (let y = 0; y < height; y++) {
                const row=spectrumRows[y], a=row[0], b=row[1];
                let power = 0;
                for (let k = a; k <= b; k++)
                    power = Math.max(power, Math.hypot(re[k], im[k]));
                values[y * width + x] = power;
                maximum = Math.max(maximum, power);
            }
            if (x % 32 === 31)
                await yieldTask();
        }
        return { width, height, values, maximum };
    }
    return Object.freeze({ combine, complement, spectrum });
}
const __F352DSP=__f347CeciliaDSPFactory();

/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.
 * No second peak tracker, chord inference, autonomous vibrato or attack envelope.
 */
/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.
 * No second peak tracker, chord inference, autonomous vibrato or attack envelope.
 */
async function __f352RenderCecilia(job, donor, options = {}) {
    const { plan, length } = job.support, sr = job.sampleRate, parameters = job.cecilia;
    if (plan.bands.length > 64)
        throw Error("The figure contains more than 64 separate voice tracks. Please split the figure.");
    const voice = M3e({ ...parameters, breath: 0, vibratoCents: 0, humanize: 0 }, sr, plan.bands.length), out = new Float32Array(length);
    const coupling = job.recipe.mode === 'state' ? job.recipe.coupling : 0, atlas = job.model.atlas, material = donor.material;
    const pole = 1 - Math.exp(-2 * Math.PI * 1200 / sr), noisePole = 1 - Math.exp(-2 * Math.PI * 3000 / sr), smooth = 1 - Math.exp(-1 / (sr * .015));
    let done = 0;
    const total = material.runs.reduce((sum, r) => sum + r.endSample - r.startSample, 0);
    for (const run of material.runs) {
        const band = plan.bands[run.voice], count = band.gainCurve.length - 1;
        let low = 0, noiseLow = 0, noiseSlow = 0, seed = (0x9e3779b9 ^ ((run.voice + 1) * 1234567) ^ run.startSample) >>> 0, stage = 0, tilt = 0, breath = parameters.breath;
        for (let at = run.startSample; at < run.endSample; at++) {
            if (at % 4096 === 0) {
                if (options.isCancelled?.())
                    throw new DOMException('Cecilia-Berechnung abgebrochen.', 'AbortError');
                options.onProgress?.(done / Math.max(1, total));
                await new Promise(r => setTimeout(r, 0));
            }
            const x = at / Math.max(1, length - 1) * count, a = Math.floor(x), b = Math.min(count, a + 1), fraction = x - a, cell = Math.round(x);
            if (!(band.gainCurve[cell] > 0)) {
                done++;
                continue;
            }
            const connected = band.gainCurve[a] > 0 && band.gainCurve[b] > 0;
            const gain = connected ? band.gainCurve[a] * (1 - fraction) + band.gainCurve[b] * fraction : band.gainCurve[cell];
            const ratio = connected ? Math.exp(Math.log(Math.max(1e-9, band.centerRatioCurve[a])) * (1 - fraction) + Math.log(Math.max(1e-9, band.centerRatioCurve[b])) * fraction) : band.centerRatioCurve[cell];
            const hz = ratio * plan.rootReferenceHz;
            if (hz >= sr * .4)
                throw Error("Carrier pitch exceeds the safe range of Cecilia synthesis.");
            while (stage + 1 < run.states.length && run.states[stage + 1].sample <= at)
                stage++;
            const state = run.states[stage], next = run.states[Math.min(run.states.length - 1, stage + 1)], fade = Math.min(1, (at - state.sample) / Math.max(1, next.sample - state.sample)), node = atlas?.nodes?.[state.nodeId]??state, nextNode = atlas?.nodes?.[next.nodeId]??next;
            const air = state.aperiodicity * (1 - fade) + next.aperiodicity * fade;
            const centroid = Math.exp(Math.log(Math.max(80, node.centroidHz??1200)) * (1 - fade) + Math.log(Math.max(80, nextNode.centroidHz??1200)) * fade);
            const wantedTilt = coupling * Math.max(-.35, Math.min(.35, Math.log2(centroid / 1800) * .15));
            tilt += smooth * (wantedTilt - tilt);
            breath += smooth * (Math.min(.45, parameters.breath*(1+coupling*air*.25)) - breath);
            const raw = voice(run.voice, hz, (at - run.startSample) / sr);
            low += pole * (raw - low);
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            seed >>>= 0;
            const random = seed / 4294967295 * 2 - 1;
            noiseLow += noisePole * (random - noiseLow);
            noiseSlow += pole * (noiseLow - noiseSlow);
            const value = low * (1 - tilt + coupling*air*.12) + (raw - low) * (1 + tilt - coupling*air*.2) + (noiseLow - noiseSlow) * breath * .5;
            const edge = Math.max(0, Math.min(1, (at - run.startSample) / (sr * .004), (run.endSample - 1 - at) / (sr * .006)));
            out[at] += value * gain * edge * .18 * parameters.outputGain;
            done++;
        }
    }
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
        if (!Number.isFinite(out[i]))
            throw Error("Cecilia produced no valid audio buffer.");
        peak = Math.max(peak, Math.abs(out[i]));
    }
    if (peak > .9)
        for (let i = 0; i < out.length; i++)
            out[i] *= .9 / peak;
    options.onProgress?.(1);
    return { pcm: out, metrics: { peak: Math.min(.9, peak), coupling, revision:41, sourceStateLink:"observed-brightness-body",generatedBreath:parameters.breath>0 } };
}

/* Heavy PCM work belongs to a disposable offline worker, never the audio graph. */
var __F352Worker=(()=>{
  let serial=0;const active=new Map();
  const script='self.postMessage({ready:true});\n'+__F352WorkerScript;
  function fallback(stage,job,input,options){
    const raw=job.model?.sourceGrains??job.model;
    const pcm=raw?.samples??input?.pcm??input?.donor?.pcm;
    const sr=job.sampleRate??raw?.sampleRate;
    const seconds=job.durationSec??pcm?.length/sr;
    if(!__F35640OfflineJob.small({samples:pcm,sampleRate:sr,durationSec:seconds,bands:job.support?.plan?.bands?.length??1}))
      throw Error('This offline job requires a working Blob Worker; the CPU fallback is bounded to small renders.');
    if(stage==='synthetic')return (job.recipe?.variantRevision==='original'?__f352RenderCeciliaOriginal:__f352RenderCecilia)(job,{material:input.material},options);
    if(stage==='combine')return (job.recipe?.variantRevision==='original'?__F352DSPOriginal:__F352DSP).combine(job,input.donor,input.synthetic,options);
    if(stage==='spectrum')return __F352DSP.spectrum(input.pcm,job.sampleRate,options);
    throw Error('Unknown offline stage.');
  }
  function run(stage,job,input,options={}){
    const id=++serial,wire={key:job.key,sampleRate:job.sampleRate};
    if(!['synthetic','combine','spectrum'].includes(stage))throw Error('Unknown offline stage.');
    if(stage!=='spectrum')Object.assign(wire,{support:{plan:job.support.plan,length:job.support.length},recipe:job.recipe,durationSec:job.durationSec});
    if(stage==='synthetic')wire.model={atlas:{nodes:(job.model?.atlas?.nodes??[]).map(n=>({centroidHz:n.centroidHz}))}};
    if(stage==='synthetic')wire.cecilia=job.cecilia;
    const handle=__F35640OfflineJob.run({script,options,label:'Forge '+stage,
      payload:{id,stage,job:wire,input},decode:m=>{if(m.id!==id||!('value' in m)||m.value==null)throw Error('Invalid offline stage receipt.');return m.value;},
      fallback:(reason,guarded)=>fallback(stage,job,input,guarded)});
    active.set(id,handle);
    return handle.promise.finally(()=>active.delete(id));
  }
  function cancel(){for(const handle of active.values())handle.cancel();active.clear();}
  return Object.freeze({run,cancel,status:()=>({available:typeof Worker==='function',active:active.size,started:active.size>0})});
})();

/* The only bridge between the pure renderer and the historical application. */
function __f352Clone(value){if(value==null||typeof value!=='object')return value;if(ArrayBuffer.isView(value))return new value.constructor(value);if(Array.isArray(value))return value.map(__f352Clone);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,__f352Clone(v)]));}
function __f352Freeze(value){if(!value||typeof value!=='object'||ArrayBuffer.isView(value))return value;for(const v of Object.values(value))__f352Freeze(v);return Object.freeze(value);}
/* F3.56.1: non-audio metadata bridge for the optional Cecilia layer.
 * F3.56's independent PCM material renderer has no grain-state schedule.
 * Project its existing source atlas along each actual run without touching PCM. */
function __f356ProjectCeciliaStates(job,material){
 const atlas=job.model?.atlas;
 if(!atlas?.nodes?.length||!material?.runs?.length)return material;
 const hop=atlas.hop||Math.max(1,Math.round(job.model.sampleRate*.02));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const run of material.runs){
  if(run.states?.length)continue;
  const length=Math.max(1,run.endSample-run.startSample),span=Math.max(1,run.sourceEnd-run.sourceStart+1);
  // Keep the UI/render cost bounded: 2..24 source-state anchors per phrase.
  const count=clamp(Math.ceil(length/(job.sampleRate*.20))+1,2,24),states=[];
  for(let i=0;i<count;i++){
   const age=Math.round(i/(count-1)*(length-1)),sample=run.startSample+age;
   let offset=(run.sourceOffset??0)+age*run.sourceSpeed;
   if(run.timeMode==='loop')offset=((offset%span)+span)%span;
   else offset=clamp(offset,0,span-1);
   const at=clamp(Math.round((run.sourceStart+offset)/hop),0,atlas.nodes.length-1),node=atlas.nodes[at];
   states.push({sample,nodeId:at,aperiodicity:clamp(node.aperiodicity??0,0,1)});
  }
  run.states=states;
 }
 return material;
}

var __F352Runtime=(()=>{
 let planMemo=null,playEpoch=0,signatureMemo=null;
 const pipeline=__f352CreatePipeline({
  async donor(job,options){
   if(job.config.params.gestaltPilot){
    const pcm=await (job.config.params.variantRevision === "original" ? __F356GestaltWorkerOriginal : __F356GestaltWorker).render(job.support.plan,job.model,job.sampleRate,job.durationSec,{...options,workbench:job.config});
    return {pcm,material:pcm.donorMaterialPlan};
   }
   if(job.config.params.materialPilot){
    // The F3.56 material renderer is NOT part of the older F3.52 worker script.
    // Its own worker preserves complete source PCM and carrier-led source time.
    const pcm=await (job.config.params.variantRevision === "original" ? __F356WorkerOriginal : __F356Worker).render(job.support.plan,job.model,job.sampleRate,job.durationSec,{...options,workbench:job.config});
    const material=pcm.donorMaterialPlan;
    // Cecilia's coupling consumes source states. F3.56 plans continuous PCM
    // runs without state hops; construct a light, read-only analysis projection
    // for the optional Cecilia stem without changing any donor PCM or timing.
    __f356ProjectCeciliaStates(job,material);
    return {pcm,material};
   }
   throw Error('Choose an active donor listening mode before rendering.');
  },
  synthetic:(job,donor,options)=>__F352Worker.run('synthetic',job,{material:donor.material},options)??(job.recipe?.variantRevision==="original"?__f352RenderCeciliaOriginal:__f352RenderCecilia)(job,donor,options),
  combine:(job,donor,synthetic,options)=>__F352Worker.run('combine',job,{donor,synthetic},options)??(job.recipe?.variantRevision==="original"?__F352DSPOriginal:__F352DSP).combine(job,donor,synthetic,options),
  buffer(pcm,sr){const buffer=xt.getContext().createBuffer(1,pcm.length,sr);buffer.copyToChannel(pcm,0);return buffer;},
  spectrum:(pcm,sr,isCancelled,job)=>__F352Worker.run('spectrum',job,{pcm},{isCancelled})??__F352DSP.spectrum(pcm,sr,{isCancelled})
 });
 function carrierSignature(state){if(!signatureMemo||signatureMemo.grid!==state.spectralData||signatureMemo.revision!==state.renderVersion)signatureMemo={grid:state.spectralData,revision:state.renderVersion,key:__f333Signature(state.spectralData)};return signatureMemo.key;}
 function effectiveRecipe(){const recipe=__F352Session.export();return {...recipe,amount:recipe.enabled?recipe.amount:0};}
 function identity(state=pe.getState()){
  const r=Vt.getSnapshot(),config=__F341Workbench.getConfig();
  const recipe=effectiveRecipe(),voice=recipe.amount>0?xR('vocal',state.carrierIntegralSynthLab?.readerSettings):null;
  return JSON.stringify(['forge-f3.55',__F353SourceIdentity.key(r.source),r.model?.hybrid?.sourceGrains?.version,r.model?.bodyV3?.registerPolicy,
   carrierSignature(state),__F3564Master.getSnapshot().tuning,state.spectralData.melodicCarrier??null,state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar,__F341Workbench.fingerprint(config),recipe.amount>0?recipe:{amount:0},voice]);
 }
 function capture(state){const runtime=Vt.getSnapshot(),source=runtime.model?.hybrid?.sourceGrains??runtime.model?.hybrid;
  if(!runtime.selected||!source?.atlas)throw Error("Please extract and activate Donor Sustain from a donor selection.");
  const workbenchConfig=__f352Clone(__F341Workbench.getConfig());
  const config=__f352Freeze({...workbenchConfig,params:{...workbenchConfig.params,carrierTranspose:workbenchConfig.params.carrierTranspose}});
  // F3.56: the PCM material experiment is a separate supported source path.
  // It intentionally keeps engine='spectral' in saved recipes so that the
  // retired historical Sustain presets are not silently reactivated.
  if(!config.params.materialPilot)
   throw Error("Please choose a compatible donor listening mode (Sound Material or Donor Sustain).");
  const durationSec=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar),sampleRate=48000,length=Math.round(sampleRate*durationSec),recipe=__f352Freeze(effectiveRecipe()),cecilia=__f352Freeze(xR('vocal',state.carrierIntegralSynthLab?.readerSettings));
  const snapshot=state.createProjectSnapshot(),grid=new ph(state.spectralData.width,state.spectralData.height);
  grid.restoreData(snapshot.spectralSnapshot);grid.melodicCarrier=snapshot.melodicCarrier??null;
  const carrierKey=JSON.stringify([__f333Signature(grid),snapshot.melodicCarrier??null,durationSec,sampleRate]);
  if(!planMemo||planMemo.key!==carrierKey){const plan=__ForgeF33.buildCarrierSupportPlan(grid,durationSec);
   if(!plan.bands.some(b=>b.gainCurve.some(v=>v>0)))throw Error("The carrier figure is empty.");
   planMemo={key:carrierKey,support:Object.freeze({plan:__f352Freeze(plan),length,activeAt:(i)=>plan.bands.some(b=>b.gainCurve[Math.round(i/Math.max(1,length-1)*(b.gainCurve.length-1))]>0)})};
  }
  const donorKey=JSON.stringify([carrierKey,__F353SourceIdentity.key(runtime.source),__F341Workbench.fingerprint(config),__f3565PitchSemis()]),syntheticKey=JSON.stringify([carrierKey,cecilia,__f3565PitchSemis(),recipe.mode==='state'?[donorKey,recipe.coupling]:null]);
  const model=__F341Workbench.materialModel(source,config);
  // Atlas and PCM are read-only owned extraction data; materialModel only replaces windows.
  return Object.freeze({key:identity(state),donorKey,syntheticKey,support:__f3565PitchSupport(planMemo.support,__f3565PitchSemis()),model,config,cecilia,recipe,sampleRate,durationSec,
   manifest:__f352Freeze({schema:'xensonar-forge-result-v1',audioOrigin:recipe.amount===0?'SOURCE_ONLY':'SOURCE_PLUS_SYNTH',carrierKey,donorKey,syntheticKey,sourceRevision:runtime.sourceRevision,sourceName:runtime.source?.fileName??'',sourceSelection:[runtime.source?.importStartSec,runtime.source?.importDurationSec],bars:state.materialExport.bars,bpm:state.materialExport.bpm,beatsPerBar:state.materialExport.beatsPerBar,config,cecilia,recipe})});
 }
 async function render(state=pe.getState()){const job=capture(state),artifact=await pipeline.render(job);if(identity()!==job.key||!Vt.getSnapshot().selected)throw new DOMException("The sound recipe changed during rendering.",'AbortError');return artifact;}
 function stop(){playEpoch++;pipeline.invalidate();__F352Worker.cancel();xt.stop();Vt.stop();}
 async function play(state=pe.getState(),options={}){stop();const token=++playEpoch,ticket=Vt.beginRender();Vt.setPlaybackStopHandler(()=>{playEpoch++;xt.stop();pipeline.invalidate();});
  const unsubscribe=pipeline.subscribe(()=>{if(token===playEpoch){const s=pipeline.getSnapshot();if(s.phase==='rendering')Vt.reportRenderProgress(ticket,s.progress);}});
  try{const artifact=await render(state);if(token!==playEpoch)return false;Vt.markFigurePrepared(ticket,state.renderVersion,artifact.key,false);
   const current=()=>token===playEpoch&&identity()===artifact.key;
   const played=await xt.playBufferInternal(artifact.buffer,artifact.durationSec,options.fromPosition??0,p=>{if(current())options.onPosition?.(p);},()=>{if(current()){Vt.finish(ticket);options.onEnd?.();}},
    {playbackRate:1,loopPreview:!!state.materialExport.loopPreview,lifecycleMode:'forge-f352-hybrid',beatGuide:{...state.materialExport,loopDurationSec:artifact.durationSec}});
   if(played&&current()){__f3564ActivateLiveGain(artifact.buffer);Vt.markPlaying(ticket);}return played&&current();
  }catch(e){if(token===playEpoch)Vt.failPlayback(ticket,e);throw e;}finally{unsubscribe();}
 }
 function current(){const artifact=pipeline.getSnapshot().result;return Vt.getSnapshot().selected&&artifact?.key===identity()?artifact:null;}
 function attach(){let stamp=identity(),selected=Vt.getSnapshot().selected;const update=()=>{const next=identity(),selection=Vt.getSnapshot().selected;if(next===stamp&&selection===selected)return;stamp=next;selected=selection;
   // An extraction owns its own generation. Do not cancel the donor loader because
   // it has just published the very source that we were waiting for.
   playEpoch++;pipeline.invalidate();__F352Worker.cancel();xt.stop();
   if(['rendering','playing'].includes(Vt.getSnapshot().phase))Vt.stop();
  };pe.subscribe(update);Vt.subscribe(update);__F341Workbench.subscribe(update);__F352Session.subscribe(update);__F3564Master.subscribe(()=>update());}
 return Object.freeze({identity,capture,render,play,stop,attach,current,getSnapshot:pipeline.getSnapshot,subscribe:pipeline.subscribe,diagnostics:()=>({...pipeline.diagnostics(),worker:__F352Worker.status()})});
})();
// Modern Sound Material/Original Grains output participates in the image overlay.
__F352Runtime.subscribe(__F35610Overlay.refresh);

function __F351CombinationRack(){
 const session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),render=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot);
 const runtime=cU(),recipe=session.recipe,[error,setError]=P.useState('');
 const current=render.result?.key===__F352Runtime.identity(),supported=wb.config.params.materialPilot;
 const slider=(name,label,help,enabled=true)=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[u.jsx('span',{children:label}),u.jsx('output',{htmlFor:'f351-'+name,children:Math.round(recipe[name]*100)+' %'})]}),u.jsx('input',{id:'f351-'+name,type:'range',min:0,max:100,step:1,value:Math.round(recipe[name]*100),disabled:!enabled,'aria-label':'Kombinieren: '+label,'aria-describedby':'f351-explain-'+name,onChange:e=>__F352Session.patch({[name]:Number(e.currentTarget.value)/100})}),u.jsx('small',{id:'f351-explain-'+name,children:help})]},name);
 const audition=async()=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");await __F352Runtime.play();}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const exportAudio=async(format)=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");const state=pe.getState(),blob=format==='flac'?await __f345ExportFlacCurrent(state):await __f333ExportCurrent(state);Yk(blob,Xk(state.materialExport.name)+'_Donor_Cecilia.'+format,'spectralForge/HybridRack');}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const mode=__F352Session.modes.find(m=>m.id===recipe.mode);
 const phase=render.phase==='rendering'?'Berechnet · '+render.stage:current?"Result up to date":render.result?"Recipe changed · recalculate result":"Ready to Render";
 return u.jsxs('div',{className:'f351-combination','data-f351-combination-rack':'true',children:[
  u.jsxs('div',{className:'f351-combo-heading',children:[u.jsx('div',{className:'f351-overline',children:"SOUND BODY"}),u.jsx('h3',{children:"Combine with"}),u.jsx('p',{children:"Donor and Cecilia. One shared musical figure."})]}),
  u.jsxs('label',{className:'f352-enable',children:[u.jsx('input',{type:'checkbox',checked:recipe.enabled,'aria-label':'Klangkombination aktivieren',onChange:e=>__F352Session.patch({enabled:e.currentTarget.checked})}),' Kombination aktiv']}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Klangerzeugung'}),u.jsx('select',{'aria-label':"Combine with Sound Generator",value:'cecilia',children:__F352Session.providers.map(p=>u.jsx('option',{value:p.id,disabled:!p.readyForPilot,children:p.label+(p.readyForPilot?'':" · later")},p.id))})]}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Cecilia · Verbindungsverfahren'}),u.jsx('select',{'aria-label':'Cecilia-Verbindungsverfahren',value:recipe.mode+'|'+(recipe.variantRevision==='original'?'original':'revised'),onChange:e=>{const parts=e.currentTarget.value.split('|');__F352Session.patch({mode:parts[0],variantRevision:parts[1]})},children:__F352Session.modes.flatMap(m=>['original','revised'].map(revision=>u.jsx('option',{value:m.id+'|'+revision,children:m.label+' · '+(revision==='original'?'1':'2')},m.id+'|'+revision)))})]}),
  u.jsxs('p',{className:'f351-method-hint',children:[mode.description,' · ',recipe.variantRevision==='original'?'Variante 1: frühere Berechnung.':'Variante 2: neu berechnete Färbung/Kopplung (Ü).']}),
  u.jsxs('div',{className:'f351-meter',role:'img','aria-label':"Sound identity: Donor "+Math.round((1-recipe.amount)*100)+' Prozent, Cecilia '+Math.round(recipe.amount*100)+" percent",children:[u.jsx('span',{style:{width:((1-recipe.amount)*100)+'%'}}),u.jsx('span',{style:{width:(recipe.amount*100)+'%'}})]}),
  slider('amount',"Sound Identity","0%: Donor Sustain. 100%: Cecilia. Between them: loudness-aware crossfade."),
  slider('coupling','Zustandskopplung',recipe.mode==='state'?"Noisiness and brightness of selected donor states shape Cecilia; time and pitch remain carrier-controlled.":"Active in States mode.",recipe.mode==='state'),
  slider('color',"Spectral Complement",recipe.mode==='spectral'?"0: blend freely. 100: gently reduce Cecilia in occupied frequency regions. Donor material remains intact.":"Active in Spectral mode.",recipe.mode==='spectral'),
  u.jsx(__F352CeciliaControls,{}),
  !supported?u.jsx('p',{className:'f341-error',role:'status',children:"For blending, choose the “Sound Material · Motion” listening mode. Historical spectral modes remain available separately."}):null,
  u.jsxs('div',{className:'f351-status',role:'status',children:[u.jsx('strong',{children:phase}),render.phase==='rendering'?u.jsx('progress',{max:1,value:render.progress,'aria-label':'Klangkombination Fortschritt'}):null,u.jsx('p',{children:recipe.enabled?"Playback, result image and export use the same rendered sound.":"Activate links the recipe to playback and export."})]}),
  u.jsxs('div',{className:'f352-rack-actions',children:[u.jsx('button',{type:'button',className:'f341-primary',disabled:!recipe.enabled||!supported||!runtime.model,onClick:()=>runtime.phase==='playing'||render.phase==='rendering'?__F352Runtime.stop():void audition(),children:runtime.phase==='playing'||render.phase==='rendering'?"Stop / Cancel":"Listen to Combination"}),...['wav','flac'].map(format=>u.jsx('button',{type:'button',disabled:!recipe.enabled||!supported||!runtime.model||render.phase==='rendering',onClick:()=>void exportAudio(format),children:format.toUpperCase()},format))]}),
  error||render.error?u.jsx('p',{role:'alert',className:'f341-error',children:error||render.error}):null,
  u.jsx('button',{type:'button',className:'f351-reset',onClick:()=>__F352Session.reset(),children:"Reset Combination Recipe"})
 ]});
}
function __F352CeciliaControls(){
 const state=P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState),p=xR('vocal',state.carrierIntegralSynthLab?.readerSettings);
 const change=(name,value)=>{const s=pe.getState(),lab=s.carrierIntegralSynthLab;s.setCarrierIntegralSynthLab({...lab,readerSettings:{...lab.readerSettings,vocal:{...lab.readerSettings?.vocal,[name]:value}},updatedAt:Date.now()});};
 return u.jsxs('details',{className:'f352-cecilia',children:[u.jsx('summary',{children:'Cecilias Klangfarbe'}),...[
  ['vowel',"Vowel Shape",0,4,.05],['formantShift','Formantlage',-10,10,.5],['breath','Hauch',0,.45,.01],['presence',"Presence",0,1,.01]
 ].map(([name,label,min,max,step])=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[label,u.jsx('output',{children:p[name].toFixed(name==='formantShift'?1:2)})]}),u.jsx('input',{type:'range',min,max,step,value:p[name],'aria-label':'Cecilia '+label,onChange:e=>change(name,Number(e.currentTarget.value))})]},name)),u.jsx('small',{children:"The carrier figure controls pitch motion, onsets and rests. Vowel shape, formant position, breath and presence shape Cecilia."})]});
}

function __F352ResultPanel(){
 const rendering=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot);
 P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState);const canvas=P.useRef(null),artifact=rendering.result,current=!!artifact&&artifact.key===__F352Runtime.identity();
 P.useEffect(()=>{if(!canvas.current||!artifact?.spectrum)return;const node=canvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(node);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,artifact.spectrum,0,0,w,h);});};paint();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(paint);observer?.observe(node);return()=>{observer?.disconnect();if(pending)cancelAnimationFrame(pending);};},[artifact]);
 return u.jsxs('section',{className:'f352-result-panel','data-f352-result-panel':'true',children:[
  u.jsxs('div',{className:'f352-result-header',children:[u.jsx('strong',{children:(!session.recipe.enabled||session.recipe.amount===0)?(__F341Workbench.getConfig().params.gestaltPilot?"Klanggestalt · Rendered Result":__F341Workbench.getConfig().params.materialPilot?"Sound Material · Combined Result":"Donor Sustain · Combined Result"):'Donor + Cecilia · gemeinsames Ergebnis'}),u.jsx('span',{role:'status',children:rendering.phase==='rendering'?rendering.stage:current?"Current":artifact?"Recipe changed · previous result":"Not calculated yet"})]}),
  rendering.phase==='rendering'?u.jsx('progress',{max:1,value:rendering.progress,'aria-label':'Forge Klangberechnung Fortschritt'}):null,
  artifact?.spectrum?u.jsx('canvas',{ref:canvas,'aria-label':"Spectrum of the Audible Forge Result"}):u.jsx('p',{children:"The carrier figure controls the donor. An enabled blend adds Cecilia."}),
  artifact?u.jsx('p',{className:'f352-result-note',children:"Output: "+(artifact.manifest.audioOrigin==='SOURCE_ONLY'?"original donor audio only":"original donor audio + Cecilia")+' · '+artifact.durationSec.toFixed(2)+' s · '+artifact.sampleRate+' Hz · '+artifact.material.runs.length+" sound events"}):null,
  rendering.error?u.jsx('p',{role:'alert',className:'f341-error',children:rendering.error}):null
 ]});
}
function __F352LegacyPanel(){return __ForgeF33.DonorMaterialPanel(P,u);}

/* F3.53: donor-conditioned structural planning. No oscillator or PCM is returned
 * by this module. Carrier run boundaries and target curves remain unchanged.
 * Historical inspirations: Bert (continuity), Antonia (event role), Cecilia
 * (within-event energy movement), HX (measured native register). L1 transfers.
 */


/* Content keys read only the selected PCM (at most eight seconds), once per
 * array/selection. IndexedDB supplies new arrays on load; equal audio still
 * reaches the same offline analysis and rendered result. */
var __F353SourceIdentity=(()=>{
 const memo=new WeakMap();
 function channel(pcm,sr,start,duration){if(!pcm?.length)return 'none';const a=Math.max(0,Math.round(start*sr)),b=Math.min(pcm.length,a+Math.round(duration*sr)),key=sr+':'+a+':'+b;let entries=memo.get(pcm);if(!entries){entries=new Map();memo.set(pcm,entries);}if(entries.has(key))return entries.get(key);
  const words=new Uint32Array(pcm.buffer,pcm.byteOffset,pcm.length);let x=2166136261,y=2246822519;for(let i=a;i<b;i++){x=Math.imul(x^words[i],16777619);y=Math.imul(y^words[i],3266489917);}const value=[sr,b-a,x>>>0,y>>>0].join(':');entries.set(key,value);if(entries.size>16)entries.delete(entries.keys().next().value);return value;
 }
 function key(source){if(!source)return 'missing';const sr=source.sampleRate,start=source.importStartSec,duration=source.importDurationSec;return [source.fileName??'',start,duration,channel(source.leftSamples??source.monoSamples,sr,start,duration),source.channelCount>1?channel(source.rightSamples,sr,start,duration):'mono'].join('|');}
 return Object.freeze({key});
})();
var __F353AnalysisCache=__createF353AnalysisCache({keyForSource:source=>__F353SourceIdentity.key(source),prepareSource:(source,isCancelled)=>__f353PrepareDonorBase(source,isCancelled),sizeOfValue:__f353AnalysisSize});
function kE(source,isCancelled=null){return __F353AnalysisCache.prepare(source,isCancelled);}





function __F353RecipePanel(){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),[name,setName]=P.useState(''),[message,setMessage]=P.useState('');
 const save=variant=>{try{const item=__F341Workbench.savePreset(name,variant);__F341Workbench.set({...__F341Workbench.getConfig(),preset:item.id});setName('');setMessage('„'+item.name+"” saved and available under Custom Recipes.");}catch(e){setMessage(e.message);}};
 return u.jsxs('div',{className:'f353-recipe-save',children:[u.jsx('input',{'aria-label':'Rezeptname',placeholder:"Name Custom Recipe",value:name,onChange:e=>setName(e.currentTarget.value),maxLength:80}),u.jsx('button',{type:'button',disabled:!name.trim(),onClick:()=>save(false),children:"Save Custom Recipe"}),u.jsx('button',{type:'button',disabled:!name.trim()||!wb.config.sourceKey,onClick:()=>save(true),children:"Save with Donor Markings"}),message?u.jsx('span',{role:'status',children:message}):null]});
}


function __F3564CarrierMiniature({material=null}){
 const ref=P.useRef(null),grid=pe(state=>state.spectralData),rev=pe(state=>state.renderVersion);
 const donor=Vt.getSnapshot(),artifact=__F352Runtime.current(),active=!!donor.source&&!!donor.model;
 P.useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx||!grid?.data)return;
  const w=canvas.width,h=canvas.height,top=h-24;
  ctx.fillStyle='#07111b';ctx.fillRect(0,0,w,h);
  const image=ctx.createImageData(w,top),iw=grid.width,ih=grid.height,src=grid.data;
  for(let y=0;y<top;y++)for(let x=0;x<w;x++){
   const sx=Math.min(iw-1,Math.floor(x/w*iw)),sy=Math.min(ih-1,Math.floor(y/top*ih));
   const v=Math.max(0,Math.min(1,src[sy*iw+sx]||0)),i=(y*w+x)*4;
   image.data[i]=Math.round(7+v*(active?38:213));
   image.data[i+1]=Math.round(15+v*(active?186:102));
   image.data[i+2]=Math.round(26+v*(active?171:48));
   image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  ctx.fillStyle='#0b1c29';ctx.fillRect(0,top,w,h-top);
  ctx.strokeStyle=active?'#2dd4bf':'#b9a579';ctx.lineWidth=1.3;
  const pcm=artifact?.pcm;
  if(pcm?.length){
   ctx.beginPath();const mid=top+12;
   for(let x=0;x<w;x++){
    const a=Math.floor(x/w*pcm.length),b=Math.max(a+1,Math.floor((x+1)/w*pcm.length));let peak=0;
    for(let i=a;i<Math.min(b,pcm.length);i+=Math.max(1,Math.floor((b-a)/15)))peak=Math.max(peak,Math.abs(pcm[i]));
    const span=Math.min(10,peak*10);ctx.moveTo(x+.5,mid-span);ctx.lineTo(x+.5,mid+span);
   }ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(0,top+12);ctx.lineTo(w,top+12);ctx.stroke();}
 },[grid,rev,active,artifact?.key,material]);
 return u.jsxs('div',{className:'f3564-carrier-mini','data-f3564-mini':'true',children:[
  u.jsx('strong',{children:'Carrier-Miniatur'}),
  u.jsx('canvas',{ref,width:320,height:120,'aria-label':"Miniature carrier figure with current donor PCM motion"}),
  u.jsx('small',{children:active?(artifact?"Orange: carrier · below: actual donor audio motion":"Orange: carrier with loaded donor · sound motion after rendering"):"Carrier Figure · Donor Not Loaded Yet"})
 ]});
}

function __F356GestaltPanel({ range, selection, material }) {
  const wb = P.useSyncExternalStore(
      __F341Workbench.subscribe,
      __F341Workbench.getSnapshot,
      __F341Workbench.getSnapshot,
    ),
    p = wb.config.params;
  const info = material?.gestaltTransform;
  const names = { imprint: "Resonant Imprint", motion: "Timbre Motion", weave: "Material States", articulation: "Articulation", signature:"Donor-Signatur",film:"Spektraler Film",air:"Hauch & Reibung",freeze:"Stillbild",wander:"Wandernd" };
  return u.jsxs("section", {
    className: "f347-control-group",
    "data-f356-gestalt": "true",
    children: [
      u.jsx("h3", { children: "Klanggestalt · " + names[p.gestaltMode] + (p.variantRevision === "original" ? " · 1" : " · 2") }),
      u.jsx("p", {
        children:
          "Your drawing leads pitch, voices, rhythm and dynamics. The donor lends its resonance colour and its own internal motion. Thin lines focus the pitch; wider strokes can preserve the source’s irregular spectral spacing. Glissandi and changes of width or intensity shape the journey through the recording.",
      }),
      u.jsxs("div", {
        className: "f3564-carrier-layout",
        children: [
          u.jsxs("div", {
            className: "f3564-carrier-controls",
            children: [
              u.jsxs("div", {
                className: "f341-controls f3564-three-cards",
                children: [
                  u.jsx(__F341Control, {
                    label: "Resonance Identity",
                    name: "gestaltIdentity",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: resonance colour moves with pitch. 1: preserve more of the donor’s original resonance frequencies and spectral troughs. Most effective with a stable tonal source.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Internal Motion",
                    name: "gestaltMotion",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: hold a source state at the chosen position. 1: travel farther through the allowed recording. Short dots use short excerpts and an observed source attack where available.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Gesture Response",
                    name: "gestaltGesture",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: even source-time motion. 1: pitch movement, stroke width and changes of intensity reshape source time. Broad strokes also retain more original irregular partial spacing.",
                  }),
                ],
              }),
              u.jsxs("div", {
                className: "f341-controls",
                children: [
                  u.jsx(__F341Control, {
                    label: "Source Position",
                    name: "position",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "Choose where a held or partial source journey begins. Material States also uses this position as a gentle preference.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Tune Carrier Together",
                    name: "carrierTranspose",
                    min: -48,
                    max: 48,
                    step: 0.1,
                    unit: " st",
                    help: "Shift all painted voices together, keeping their intervals.",
                  }),
                  u.jsxs("label", {
                    className: "f341-control",
                    children: [
                      u.jsx("span", { children: "Reference for Unpitched Material" }),
                      u.jsx("input", {
                        type: "number",
                        min: 20,
                        max: 20000,
                        step: 1,
                        value: p.carrierNeutralHz,
                        "aria-label": "Klanggestalt Unpitched Reference",
                        onChange: (e) => {
                          if (e.currentTarget.value)
                            __F341Workbench.patch({
                              carrierNeutralHz: Number(e.currentTarget.value),
                            });
                        },
                      }),
                      u.jsx("small", {
                        children:
                          "Hz. Confident tonal material follows its observed fundamental; textures and uncertain passages use the source region’s tonal reference, or this value when no reliable pitch is available.",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          u.jsx(__F3564CarrierMiniature, { material }),
        ],
      }),
      p.gestaltMode === "articulation" ? u.jsx(__F341Control,{label:"Articulation Transfer",name:"articulationAmount",min:0,max:1,step:.01,help:"Use the observed donor beginning, sustained body and ending within each painted phrase. Connected glissandi stay connected; pauses remain silent."}) : null,
      u.jsxs("label", {
        children: [
          "Source Journey ",
          u.jsx("select", {
            "aria-label": "Klanggestalt Source Journey",
            value: p.planning === "reference" ? "reference" : "neutral",
            onChange: (e) => __F341Workbench.patch({ planning: e.currentTarget.value }),
            children: [
              u.jsx("option", { value: "neutral", children: "Use Allowed Source Regions" }),
              u.jsx("option", { value: "reference", children: "Use a Marked Reference Journey" }),
            ],
          }),
        ],
      }),
      p.planning === "reference"
        ? u.jsxs("div", {
            children: [
              u.jsx("span", {
                children: selection
                  ? " Reference " +
                    (p.referenceStart * selection.duration).toFixed(2) +
                    "–" +
                    (p.referenceEnd * selection.duration).toFixed(2) +
                    " s "
                  : "",
              }),
              u.jsx("button", {
                type: "button",
                disabled: !range,
                onClick: () =>
                  __F341Workbench.patch({ referenceStart: range[0], referenceEnd: range[1] }),
                children: "Use Marking as Reference",
              }),
            ],
          })
        : null,
      u.jsx("p", {
        className: "f341-muted",
        children:
          p.gestaltMode === "weave"
            ? "Observed donor states combine level, spectral envelope, brightness and aperiodicity. Phrase selection also considers observed transitions. Include/Exclude markings remain boundaries."
            : p.gestaltMode === "motion"
              ? "Signed pitch movement and changes in the stroke shape move source time forward or backward with reflected boundaries. Pitch and pauses continue to follow the drawing."
              : "The original recording supplies every audible component. Resonance identity changes its spectral colouring without adding a second voice or a noise layer.",
      }),
      material?.stateField ? u.jsx("p",{role:"status",children:"Observed Donor States: "+material.stateField.states.length+" · "+material.stateField.analyzedFrames+" contained analysis frames · transitions refer to source order."}) : null,
      info
        ? u.jsx("p", {
            role: "status",
            children:
              "Rendered: " +
              names[info.mode] +
              " · " +
              Math.round(info.identity * 100) +
              "% resonance identity · " +
              Math.round(info.motion * 100) +
              "% internal motion. Playback and export use this same result.",
          })
        : null,
    ],
  });
}


function __F356MaterialPanel({range,selection,material}){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),p=wb.config.params;
 const info=material?.materialTransform;
 return u.jsxs('section',{className:'f347-control-group','data-f356-material':'true',children:[
  u.jsx('h3',{children:"Sound Material · Carrier Moves the Recording" + (p.variantRevision === "original" ? " · 1" : " · 2") + ""}),
  u.jsx('p',{children:"An experiment with the full recording: each carrier voice draws its own sound motion through the figure. Choose how source time advances and experiment with a shared pitch reference."}),
  u.jsxs('div',{className:'f3564-carrier-layout',children:[u.jsxs('div',{className:'f3564-carrier-controls',children:[u.jsxs('div',{className:'f341-controls f3564-three-cards',children:[
   u.jsx(__F341Control,{label:"Tune Carrier Together",name:'carrierTranspose',min:-48,max:48,step:.1,unit:" st",help:"Continuously shifts all carrier voices together."}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:"Unchanged Pitch at Carrier Position"}),u.jsx('input',{type:'number',min:20,max:20000,step:1,value:p.carrierNeutralHz,'aria-label':"Carrier Position for Unchanged Pitch",onChange:e=>{if(e.currentTarget.value)__F341Workbench.patch({carrierNeutralHz:Number(e.currentTarget.value)})}}),u.jsx('small',{children:"Hz on the canvas. Fixed reference independent of the donor; above this position the entire recording shifts up, below it shifts down."})]}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:'Quellzeit'}),u.jsx('select',{'aria-label':"Sound Material Source Time",value:p.materialTime,onChange:e=>__F341Workbench.patch({materialTime:e.currentTarget.value,...(e.currentTarget.value==='hold'&&p.position===0?{position:.5}:{})}),children:[u.jsx('option',{value:'stretch',children:"Full Motion · Stretch to Event Length"}),u.jsx('option',{value:'loop',children:'Eigenes Tempo · wiederholen'}),u.jsx('option',{value:'hold',children:'Klangzustand halten'})]}),u.jsx('small',{children:p.materialTime==='stretch'?"One continuous source region runs through each carrier event once. Its own timing variations are stretched along with it.":p.materialTime==='loop'?"Source time runs at the original tempo; only the loop boundary is crossfaded. Pitch transposition may introduce reconstruction artifacts.":"One excerpt stays fixed. This also freezes its internal motion."})]}),
   ]}),
   p.materialTime!=='stretch'?u.jsx('div',{className:'f3564-position-row',children:u.jsx(__F341Control,{label:'Quellposition',name:'position',min:0,max:1,step:.01,help:"Start position within the allowed continuous source region."})}):null
  ]}),u.jsx(__F3564CarrierMiniature,{material})]}),
  u.jsxs('label',{children:["Choose Source Motion ",u.jsx('select',{'aria-label':"Choose Sound Material Motion",value:p.planning==='reference'?'reference':'neutral',onChange:e=>__F341Workbench.patch({planning:e.currentTarget.value}),children:[u.jsx('option',{value:'neutral',children:"Use Allowed Source Range"}),u.jsx('option',{value:'reference',children:'Fest markierter Referenzverlauf'})]})]}),
  p.planning==='reference'?u.jsxs('div',{children:[u.jsx('span',{children:selection?' Referenz '+(p.referenceStart*selection.duration).toFixed(2)+'–'+(p.referenceEnd*selection.duration).toFixed(2)+' s ':''}),u.jsx('button',{type:'button',disabled:!range,onClick:()=>__F341Workbench.patch({referenceStart:range[0],referenceEnd:range[1]}),children:"Use Marking as Reference"})]}):null,
  u.jsx('p',{className:'f341-muted',children:"Include/Exclude limits original material. Each carrier event remains within a continuous source region. Quiet states are not individually boosted. Playback and export use the same audio buffer."}),
  info?u.jsx('p',{role:'status',children:"Last Auditioned State: "+({stretch:'Verlauf gedehnt',loop:'Eigenes Tempo',hold:'Klangzustand gehalten'}[info.timeMode]??"Sound Material")+' · gemeinsame Tonlage '+info.transpose.toFixed(1)+" semitones."}):null
 ]});
}

function __F341UseMaterialPlan({effectiveModel,carrierState,duration,planRate,config}){
 return P.useMemo(()=>{try{return effectiveModel?__f342Plan(carrierState.spectralData,effectiveModel,config,duration,planRate):{runs:[],error:''};}catch(e){return {runs:[],error:e.message};}},[effectiveModel,config,carrierState.spectralData,carrierState.renderVersion,duration,planRate]);
}
function __F341UseWorkshopVisuals({selection,source,setHeat,setError,body,canvas,effectiveModel,hybrid,heat,config,layer,range,point,viewport,materialError,linkMode,runs,selectedRun,showOutput,outputCanvas,output}){
 P.useEffect(()=>{let cancelled=false;setHeat(null);if(selection){const cached=__F341Spectrograms.get(source);if(cached)setHeat(cached);else __f341Spectrogram(selection.samples,selection.sampleRate,()=>cancelled).then(value=>{if(value&&!cancelled){__F341Spectrograms.set(source,value);setHeat(value)}}).catch(e=>{if(!cancelled)setError(String(e.message??e))});}return()=>{cancelled=true};},[selection,source]);
 P.useEffect(()=>{if(!selection||!body)return;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;__f341Paint(canvas.current,selection,body,effectiveModel??{...hybrid,sourceIndex:{...hybrid.sourceIndex,windows:[]}},heat,config,layer,range,point,viewport,materialError?[]:linkMode==='source'?runs.filter(run=>point!=null&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate>=run.sourceStart&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate<=run.sourceEnd):runs,linkMode==='source'?null:selectedRun);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(canvas.current);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[selection,body,effectiveModel,heat,config,layer,range,point,viewport,runs,selectedRun,materialError,linkMode]);
 P.useEffect(()=>{if(!showOutput||!outputCanvas.current||!output?.mantle)return;const c=outputCanvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(c);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,output.mantle,0,0,w,h);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(c);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[showOutput,output]);
 }

/* F3.56.23 · Donor Workbench boundaries: event handlers and view, no new React mount site. */
function __f35623WorkbenchCanvasInteractions({drag,keyboardAnchor,setLayer,setLinkMode,setPoint,setRange,selection,hybrid,runs,setSelectedRun}){
const setFromPointer=e=>{const c=e.currentTarget,box=c.getBoundingClientRect(),g=c.__f341Geometry;if(!g)return null;return __F341Workbench.clamp(g.lo+((e.clientX-box.left-g.left)/g.width)*(g.hi-g.lo),g.lo,g.hi);};
const down=e=>{if(e.button!==0)return;const f=setFromPointer(e);if(f==null)return;const box=e.currentTarget.getBoundingClientRect(),g=e.currentTarget.__f341Geometry,y=e.clientY-box.top;if(y>=g.rowTop&&y<g.rowTop+g.rowHeight*6)setLayer(__F341Workbench.layers[Math.floor((y-g.rowTop)/g.rowHeight)].id);drag.current={start:f,x:e.clientX};keyboardAnchor.current=null;setLinkMode('source');setPoint(f);setRange(null);const sample=(f*selection.duration-selection.eventStart)*hybrid.sampleRate;const linked=runs.findIndex(run=>sample>=run.sourceStart&&sample<=run.sourceEnd);setSelectedRun(linked<0?null:linked);e.currentTarget.setPointerCapture(e.pointerId);};
const move=e=>{if(!drag.current)return;const f=setFromPointer(e);if(f==null)return;setPoint(f);if(Math.abs(e.clientX-drag.current.x)>4)setRange([Math.min(f,drag.current.start),Math.max(f,drag.current.start)]);};
const up=e=>{if(drag.current){move(e);drag.current=null;}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
return {down,move,up};
}
function __f35623WorkbenchKeyboard({canvas,selection,point,viewport,setPoint,setLinkMode,keyboardAnchor,setRange,close,dialog,runtime,preview,stopPreview,previewPending}){
const keydown=e=>{if(e.target===canvas.current&&selection&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const start=point??viewport[0],next=__F341Workbench.clamp(start+(e.key==='ArrowLeft'?-1:1)*.01/selection.duration,0,1);setPoint(next);setLinkMode('source');if(e.shiftKey){if(keyboardAnchor.current==null)keyboardAnchor.current=start;setRange([Math.min(keyboardAnchor.current,next),Math.max(keyboardAnchor.current,next)]);}else{keyboardAnchor.current=null;setRange(null);}}if(e.key==='Escape'){e.preventDefault();close();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();e.shiftKey?__F341Workbench.redo():__F341Workbench.undo();}if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key===' '&&e.target===dialog.current){e.preventDefault();(runtime.phase==='playing'||runtime.phase==='rendering'||previewPending)?stopPreview():void preview();}e.stopPropagation();};
return keydown;
}
function __f35623WorkbenchAnalysisView({action,analysisText,availableRoles,body,busy,canvas,choiceIndex,config,down,drag,frame,frameIndex,hybrid,layer,mark,materialMode,metrics,move,point,range,reanalyse,selection,setLayer,setViewport,source,sourceMode,up}){
return u.jsxs('div',{className:'f341-main',children:[u.jsxs('div',{className:'f341-source',children:[
   u.jsxs('div',{className:'f341-viewtools',children:[u.jsx('strong',{children:"Donor Selection · Spectrum & Time"}),action("Entire Selection",()=>setViewport([0,1])),action("Enlarge Marking",()=>range&&setViewport(range),!range)]}),
   u.jsx('canvas',{ref:canvas,className:'f341-canvas','data-f350-sample':'true','aria-label':"Donor Spectrum with Analysis Layers",tabIndex:0,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{drag.current=null}}),
   u.jsxs('div',{className:'f341-layerbuttons',children:__F341Workbench.layers.map(item=>action(item.label,()=>setLayer(item.id),false,{key:item.id,'aria-pressed':layer===item.id,style:{borderColor:layer===item.id?item.color:undefined,color:layer===item.id?item.color:undefined}}))}),
   u.jsx('p',{className:'f341-explanation',children:config.params.gestaltPilot?(layer==='material'?"Turquoise marks the allowed original source regions. Each carrier phrase stays in one connected region.":"The original PCM supplies the sound. Confident pitch observations guide tonal transport; resonance colour and gesture-shaped source time form this listening mode."):materialMode?(layer==='material'?"Turquoise shows allowed continuous source regions. The recording is not filtered here by sound similarity.":"Analysis describes the source; it does not determine transposition or split sound into tone and noise here."):sourceMode?(layer==='dynamics'?"The measured donor level acts as a sound-state index: quieter carrier passages select softer source states, louder passages select stronger states.":layer==='material'?"All audible sound states are available; your Include and Exclude markings restrict the source.":analysisText[layer]):analysisText[layer]}),
   u.jsx('p',{className:'f341-muted',children:materialMode?"The entire selected recording is available. Drag to mark a region; Include and Exclude shape source motion.":sourceMode?"The entire marked source is available. Quiet and strong states provide different Donor Sustain material. Drag to mark, use arrow keys to inspect.":"Dimmed regions lie outside the automatically analyzed sound event. A marking there can be analyzed as a new donor selection. Sample keyboard: arrows inspect, Shift + arrows select."})
  ]}),u.jsxs('aside',{className:'f341-inspector',children:[
   u.jsx('h3',{children:"Material & Examined Position"}),u.jsx('p',{children:point==null?"Click the sequence or an analysis row.":(point*selection.duration).toFixed(3)+" s in selection · "+(source.importStartSec+point*selection.duration).toFixed(3)+" s in file"}),
   u.jsxs('details',{className:'f350-analysis-details',children:[u.jsx('summary',{children:"Measured Analysis Values"}),frame?u.jsxs('dl',{children:[["Fundamental Frequency",metrics.pitchHz>0?metrics.pitchHz.toFixed(1)+' Hz':"not reliable"],["Pitch Confidence",(metrics.confidence*100).toFixed(0)+' %'],["Noise indicator",(metrics.noise*100).toFixed(1)+' %'],["Relative Level",(metrics.level*100).toFixed(0)+' %'],['Spektralspitzen',String(frame.spectralPeaks?.length??0)],['Materialentscheidung',__f342DecisionText(choiceIndex?.frameDecisions?.[frameIndex])],['Analysevorschlag',hybrid.kind==='periodic'?'periodisch':hybrid.kind==='modal'?'Resonanzmaterial':'Textur']].map(([a,b])=>u.jsxs('div',{children:[u.jsx('dt',{children:a}),u.jsx('dd',{children:b})]},a))}):u.jsx('p',{className:'f341-muted',children:point==null?"Analysis values appear here.":"This position lies outside the current event analysis."})]}),
   u.jsx('h3',{children:sourceMode?"Observed Attacks":"Onset & Material Rules"}),u.jsx('p',{className:'f341-muted',children:sourceMode?(hybrid.atlas?.attacks?.length??0)+" brief level rises observed. A selection boundary with ongoing sound counts as sustained sound.":__F347OnsetText(body)}),
   !sourceMode&&!materialMode&&u.jsxs('div',{className:'f347-choice',children:[
    u.jsxs('label',{children:["Material Strategy",u.jsxs('select',{'aria-label':'Donor Materialstrategie',disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),value:config.params.materialPolicy,onChange:e=>__F341Workbench.patch({materialPolicy:e.currentTarget.value}),children:[u.jsx('option',{value:'similar',children:"Prefer Similar States"}),u.jsx('option',{value:'evolving',children:"Allow Varying Motion"})]})]}),
    u.jsx('p',{children:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include')?"Direct window selection or your Include markings determine the material here.":config.params.materialPolicy==='similar'?"Aperiodicity, spectral shape, level and, for periodic material, pitch confidence restrict the candidate pool. Adjust tolerance or choose motion mode.":"Local changes in spectral shape, level and aperiodicity divide the motion into material segments. Noisy or changing frames are not rejected solely for their sound class."}),
    u.jsxs('label',{children:[(config.params.materialPolicy==='similar'?"Similarity Tolerance":"Sensitivity to Segment Changes")+' · '+config.params.selectionTolerance.toFixed(2)+'×',u.jsx('input',{type:'range','aria-label':'Donor Auswahlspielraum',min:.5,max:2.5,step:.05,value:config.params.selectionTolerance,disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),onChange:e=>__F341Workbench.patch({selectionTolerance:Number(e.currentTarget.value)})})]}),
    u.jsx('p',{children:config.params.materialPolicy==='similar'?"Higher = wider similarity tolerance. Level and pitch limits remain part of this strategy.":"Higher = more sensitive to local changes; more material segments. This is a segmentation choice, not a rating of the sound."}),
    u.jsx('p',{children:(choiceIndex?.windows?.length??0)+" permitted material windows · "+(choiceIndex?.acceptedFrames?.length??0)+" accepted analysis frames"+(choiceIndex?.fallback?" · automatic fallback region":'')})
   ]}),u.jsx('h3',{children:"Edit Material"}),u.jsx('p',{children:range?'Markiert: '+(range[0]*selection.duration).toFixed(3)+'–'+(range[1]*selection.duration).toFixed(3)+' s':"Drag to select a region directly in the sequence."}),
   u.jsx('div',{className:'f341-mark-actions',children:Object.entries(availableRoles).map(([id,label])=>action(label,()=>mark(id),!range,{key:id,'data-f341-mark':id}))}),
   action("Reanalyze Region as Donor",()=>void reanalyse(),!range||busy),
   !sourceMode&&!materialMode&&u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Direkte Fensterwahl'}),u.jsx('select',{'aria-label':'Donor Materialfenster',value:config.params.windowMode,onChange:e=>__F341Workbench.patch({windowMode:e.currentTarget.value}),children:[u.jsx('option',{value:'auto',children:"Choose by Material Strategy"}),u.jsx('option',{value:'all',children:"Allow Entire Analyzed Sound Body"}),u.jsx('option',{value:'pin',children:"Lock One Original Auto Window"})]})]}),
   !sourceMode&&!materialMode&&config.params.windowMode==='pin'?u.jsx('select',{'aria-label':'Auto-Fenster festhalten',value:config.params.windowId,onChange:e=>__F341Workbench.patch({windowId:Number(e.currentTarget.value)}),children:(hybrid.sourceIndex?.windows??[]).map(win=>u.jsx('option',{value:win.id,children:'Fenster '+(win.id+1)+' · '+((win.endSample-win.startSample)/hybrid.sampleRate).toFixed(2)+' s'},win.id))}):null,
   u.jsx('p',{className:'f341-muted',children:materialMode?"Include selects source regions, Exclude removes them. Without markings, the entire selection is available.":sourceMode?"Include limits the source; Exclude removes regions. Without these markings, all audible states remain available.":config.regions.some(r=>r.role==='include')?"Manual Include regions replace automatic window selection. Excluded regions are then subtracted.":"Noise/Tonal markings weight the spectrum used there. They do not change measured analysis values."})
  ]})]});
}

/* F3.56.24: only workshop action ownership; the Vt generation/ticket remains authoritative for extraction and rendering. */
function __f35624WorkbenchActivity({operation,activity,disposed,setBusy,setPreviewPending,setError}){
 const isCurrent=token=>token!=null&&!disposed.current&&operation.current===token&&activity.current?.token===token;
 const begin=kind=>{if(disposed.current)return null;if(activity.current)Vt.stop();const token=++operation.current;activity.current={token,kind};setBusy(true);setPreviewPending(kind==='preview');setError('');return token;};
 const finish=token=>{if(!isCurrent(token))return;activity.current=null;setBusy(false);setPreviewPending(false);};
 const cancel=(stopAudio=true)=>{if(disposed.current)return;operation.current++;activity.current=null;setBusy(false);setPreviewPending(false);if(stopAudio)Vt.stop();};
 const dispose=()=>{if(disposed.current)return;const owned=!!activity.current;disposed.current=true;operation.current++;activity.current=null;if(owned)Vt.stop();};
 const error=(token,e)=>{if(isCurrent(token)&&e?.name!=='AbortError')setError(e?.message??String(e));};
 return {begin,isCurrent,finish,cancel,dispose,error};
}
/* F3.56.31 Workbench / recipe presentation boundaries (no hooks, scheduler or audio ownership). */
/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchExpertControls({materialMode,sourceMode,config,controls,runs,outputCurrent,output,planned}) {
  return !materialMode&&u.jsxs('details',{className:'f350-specialist',children:[u.jsx('summary',{children:sourceMode?"Source Motion & Formant Position":"Spectral Projection Controls"}),
 u.jsxs('div',{className:'f341-controls-header',children:[u.jsxs('div',{children:[u.jsx('h3',{children:"03 · Design Transfer"}),u.jsx('p',{children:"The carrier figure controls time, pitch motion and rests. Control changes stop the preview. The current recipe is rendered on the next play. Apply activates it in Forge."})]}),u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Materialrichtung'}),u.jsx('select',{'aria-label':'Donor Materialrichtung',value:config.params.direction,onChange:e=>__F341Workbench.patch({direction:e.currentTarget.value}),children:[u.jsx('option',{value:'pendulum',children:'Pendeln'}),u.jsx('option',{value:'forward',children:"Forward"}),u.jsx('option',{value:'reverse',children:"Backward"})]})]})]}),
  ...[
   ["Project Spectrum onto Carrier Figure",['mapping','resonance','formant','spread']],
   ["Read Material & Transfer Dynamics",['motion','position','dynamics']],
   ['Vorhandene spektrale Anteile gewichten',['noise','tonal']]
  ].filter(([,names])=>!sourceMode||names.includes('motion')).map(([title,names])=>u.jsxs('div',{className:'f347-control-group',children:[u.jsx('h4',{children:title}),u.jsx('div',{className:'f341-controls',children:controls.filter(c=>names.includes(c.name)&&(!sourceMode||['resonance','formant','position'].includes(c.name)||c.name==='motion'&&config.params.sustainFlavor==='motion')).map(item=>u.jsx(__F341Control,item,item.name))})]},title)),
  !sourceMode&&config.params.signaturePilot&&u.jsx('p',{className:'f341-muted',children:"Donor-fidelity experiments: Preserve Spectrum opens the carrier mask; Preserve Source Motion avoids local pitch normalization. All three at 0 = baseline engine without experiments. Scale Peak Neighbors also changes analysis-window lobes; its quality depends on the material. With a static image, the second control cannot preserve moving vibrato. Neither experiment changes the saved original samples."}),
  !sourceMode&&u.jsx('p',{className:'f341-muted',children:"Noise and tonal weights both default to 1: no additional separation. The weights are a spectral interpretation, not isolated breath/noise or tonal tracks. With textures lacking reliable partial frequencies, their separate effects may be subtle."}),
  !sourceMode&&u.jsxs('div',{className:'f347-window-controls',children:[
   u.jsxs('label',{children:["Spectral Grain Windows · Rule",u.jsxs('select',{'aria-label':'Donor Fensterregel',value:config.params.windowStrategy,onChange:e=>__F341Workbench.patch({windowStrategy:e.currentTarget.value}),children:[u.jsx('option',{value:'capacity',children:"F3-45 · By Available Material Span"}),u.jsx('option',{value:'structure',children:"By Periods & Local Changes"}),u.jsx('option',{value:'duration',children:"Custom Target Duration"})]})]}),
   u.jsx(__F341Control,controls.find(c=>c.name==='detail')),
   config.params.windowStrategy==='duration'?u.jsxs('label',{children:['Zieldauer · '+config.params.windowMs.toFixed(0)+' ms',u.jsx('input',{type:'range','aria-label':'Donor Fenster Zieldauer',min:8,max:170,step:1,value:config.params.windowMs,onChange:e=>__F341Workbench.patch({windowMs:Number(e.currentTarget.value)})})]}):null,
   u.jsx('p',{children:config.params.windowStrategy==='capacity'?"The established F3-45 rule remains the baseline: the shortest allowed material span per voice limits window length.":config.params.windowStrategy==='structure'?"The rule estimates duration from observed periods and local changes. Stronger changes shorten windows; available material span still limits their length.":"Target duration is rounded to a power-of-two FFT size and limited by available material span."}),
   u.jsx('p',{'data-f347-window-summary':'true',children:runs.length?"Actual "+[...new Set(runs.filter(r=>r.workbenchRead).map(r=>r.workbenchRead.size))].sort((a,b)=>a-b).map(n=>n+' Samples / '+(n/(outputCurrent?output.buffer.sampleRate:planned.sampleRate)*1000).toFixed(1)+' ms · Raster '+((outputCurrent?output.buffer.sampleRate:planned.sampleRate)/n).toFixed(1)+' Hz').join(' · ')+' · '+(outputCurrent?'gerendert':'geplant'):"Window sizes appear once the figure contains a carrier run."}),
   u.jsx('p',{children:"Short windows track changes more closely but resolve frequency more coarsely. Long windows preserve finer spectral structure. Original PCM excerpts are read with overlap and projected spectrally in full; analysis values do not replace the audio."})
  ]}),
  sourceMode&&u.jsx(__F341Control,{label:'Formantlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:"0 preserves the original source pitch. This shift is an intentional timbral change."})
 ]});
}

/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchABCompare({action,wb,busy}) {
  return u.jsxs('details',{className:'f347-recipe-compare',children:[u.jsx('summary',{children:"Optional: Compare Two Transfer Recipes"}),u.jsxs('div',{children:[action("Remember Recipe A",()=>__F341Workbench.storeA(),busy),action(wb.compareSide==='A'?"Switch to Recipe B":"Load Recipe A",()=>__F341Workbench.toggleAB(),!wb.hasA||busy)]}),u.jsx('p',{className:'f341-muted',children:"Only controls and markings change. Source, carrier and tempo remain the same. Each side is heard with the normal Play control; no finished audio take is saved."})]});
}

/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchPresetSave({presetName,setPresetName,setError,config,materialError,action}) {
  return u.jsxs('footer',{className:'f341-footer',children:[u.jsx('input',{'aria-label':"Name Custom Recipe",placeholder:"Name Preset or Donor Variant",value:presetName,onChange:e=>setPresetName(e.currentTarget.value)}),action("Save Parameter Preset",()=>{try{const item=__F341Workbench.savePreset(presetName);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()),action("Save Donor Variant",()=>{try{const item=__F341Workbench.savePreset(presetName,true);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()||!!materialError)]});
}

/* F3.56.31: immutable description semantics; fresh array per render as before. */
function __f35631WorkbenchControlDescriptors({hybrid,sourceMode}) {
  return [
  {label:"Projection · Partial Structure ↔ Canvas",name:'mapping',min:0,max:1,help:"Auto follows the analysis suggestion and figure width. You can override this assumption with the control."},
  {label:'Resonanzen erhalten',name:'resonance',min:0,max:1,help:hybrid?.kind==='periodic'?'Periodischer Donor · aktive Resonanzkorrektur.':"Inactive for this donor · requires periodic material."},
  {label:'Donor-Spektrum erhalten · Versuch',name:'sourceSpectrum',min:0,max:1,step:.05,help:"0 = exactly the previous sound. Higher values retain more of the original donor frequencies instead of cutting them with the carrier canvas. Pitch, glissandi and voices remain carrier-controlled. Noise components may also become more pronounced."},
  {label:'Eigenbewegung erhalten · Versuch',name:'sourceMotion',min:0,max:1,step:.05,help:hybrid?.kind==='periodic'?"0 = previous normalization. 1 = preserve natural vibrato and source pitch motion relative to the carrier melody; playback remains tied to source motion. To isolate the effect, set Donor Spectrum to 1 and Material Motion to Forward.":"The source was not recognized as stably tonal: this experiment does not change pitch mapping here."},
  {label:'Peak-Nachbarschaft skalieren · Versuch',name:'spectralCohesion',min:0,max:1,step:.05,help:"0 = previous sound. 1 = when transposing, frequency spacings immediately around spectral peaks shift proportionally too. This may preserve rough or complex sounds differently, but can also create blur. Active only in this experimental listening mode."},
  {label:'Resonanzlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:hybrid?.kind==='periodic'?"Shifts resonance correction.":"Inactive for this donor · requires periodic material."},
  {label:'Spektrale Breite',name:'spread',min:.5,max:2,help:"Affects the broad-area component."},
  {label:sourceMode?"Body Change Speed":'Materialbewegung',name:'motion',min:0,max:3,help:sourceMode?"Motion only: pace of slow, phase-compatible loop changes. 0 holds the same body.":"0 holds the source position."},
  {label:sourceMode?'Bevorzugter Quellort':'Startposition im Fenster',name:'position',min:0,max:1,help:sourceMode?"When seam quality is similar, prefer a loop body closer to this source position.":"Start center within the yellow FFT-safe span for each carrier run."},
  {label:"Noise Component Weight",name:'noise',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure. Energy correction can balance relative weighting.":"Relative weight; total energy is compensated."},
  {label:'Tonale Anteile gewichten',name:'tonal',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure; effect may be absent.":"Weight around partial frequencies; not an isolated tonal stem."},
  {label:"Balance Donor Level",name:'dynamics',min:0,max:1,help:"0 retains more microdynamics."},
  {label:"Shorten Windows",name:'detail',min:.25,max:1,step:.25,help:"Powers of two: full, half or quarter length of the selected window rule."}
 ];
}

/* F3.56.34 EXPERIMENTAL UI — Dual Donor Assembly. No synth, no audio routing changes.
 * Donor Library is read-only here. Edits persist as a compact, explicit blueprint only.
 * Existing Forge/Workbench state, carrier, audio contexts and live engine remain untouched.
 */
/* One shared spectral body, built offline from an explicit, revision-bound recipe.
 * All audible bins derive from marked PCM. No oscillators/noise generators, no A+B player. */
/* One shared spectral body, built offline from an explicit, revision-bound recipe.
 * All audible bins derive from marked PCM. No oscillators/noise generators, no A+B player. */
function __f35636DualDSPFactory() {
  const version='dual-donor-spectral-body-f3.56.41', TAU=Math.PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), wrap=x=>x-TAU*Math.round(x/TAU);
  function fft(re,im,inverse=false) {
    const n=re.length;
    for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
    for(let len=2;len<=n;len*=2){const ang=(inverse?TAU:-TAU)/len,cr=Math.cos(ang),ci=Math.sin(ang);
      for(let start=0;start<n;start+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const a=start+j,b=a+len/2,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;
        re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nw=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nw;}}}
    if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
  }
  function sample(pcm,pos) {if(pos<0||pos>pcm.samples.length-1)return 0;const a=Math.floor(pos),b=Math.min(pcm.samples.length-1,a+1);return pcm.samples[a]+(pcm.samples[b]-pcm.samples[a])*(pos-a);}
  const freq=(y,sr)=>35*Math.pow(sr*.46/35,1-y);
  function validate(plan,sources,settings={}) {
    if(plan?.schema!=='xensonar-dual-donor-ui-v2')throw Error('Unsupported Dual Donor blueprint.');
    for(const slot of ['A','B']){const s=sources?.[slot];if(!(s?.samples instanceof Float32Array)||!s.samples.length||!(s.sampleRate>=8000&&s.sampleRate<=192000))throw Error('Load both donor recordings first.');
      if(!Number.isFinite(s.duration)||Math.abs(s.duration-s.samples.length/s.sampleRate)>2/s.sampleRate)throw Error('Donor '+slot+' duration does not match its PCM.');
      if(!s.revision||s.revision!==plan.sources?.[slot]?.revision)throw Error('Confirm the content revision of Donor '+slot+' before synthesis.');
      if(s.samples.byteLength>48*1024*1024)throw Error('Donor '+slot+' exceeds the 48 MiB input limit.');}
    if(!plan.links?.length)throw Error('Connect at least one region from each donor.');
    if(plan.links.length>12)throw Error('This renderer supports up to 12 relationships per body.');
    if(!['linked_only','keep_A','keep_B'].includes(plan.remainder))throw Error('Choose how unlinked material should be treated.');
    const ids=new Set(),linkIds=new Set();
    for(const r of plan.regions??[]){if(ids.has(r.id))throw Error('Region IDs must be unique.');ids.add(r.id);}
    const links=plan.links.map(l=>{
      if(typeof l.id!=='string'||!l.id||linkIds.has(l.id))throw Error('Every relationship needs a unique ID.');linkIds.add(l.id);
      const a=plan.regions.find(r=>r.id===l.a&&r.slot==='A'),b=plan.regions.find(r=>r.id===l.b&&r.slot==='B');
      if(!a||!b)throw Error('A relationship refers to unavailable marks.');
      if(!['cross','imprint','interlock'].includes(l.mode))throw Error('Unknown relationship operation.');
      if(l.mode==='imprint'&&!['A_to_B','B_to_A'].includes(l.direction))throw Error('Set the direction of every Imprint relationship.');
      for(const r of [a,b]){if(![r.x0,r.x1,r.y0,r.y1].every(Number.isFinite)||r.x0<0||r.x1>1||r.y0<0||r.y1>1||r.x1<=r.x0||r.y1<=r.y0)throw Error('Invalid time-frequency mark.');
        if((r.x1-r.x0)*sources[r.slot].duration<.025)throw Error('Each marked time window needs at least 25 ms.');}
      return {id:l.id,mode:l.mode,direction:l.direction,A:a,B:b};
    });
    const sampleRate=48000, duration=Number(settings.duration??Math.min(8,Math.max(...links.flatMap(l=>[l.A,l.B].map(r=>(r.x1-r.x0)*sources[r.slot].duration)))));
    if(!Number.isFinite(duration)||duration<.1||duration>8)throw Error('Choose a hybrid duration between 0.1 and 8 seconds.');
    const strength=clamp(Number(settings.strength??.8),0,1);if(!Number.isFinite(strength))throw Error('Invalid relationship strength.');
    return {links,sampleRate,duration,strength,remainder:plan.remainder};
  }
  const kernels=new Map();
  function bandlimited(source,pos,step,first=0,last=source.samples.length-1){
    if(step<=1.02)return sample(source,pos);
    let table=kernels.get(step);const radius=Math.min(64,Math.ceil(8*step)),phases=512;
    if(!table){table=Array.from({length:phases},(_,p)=>{const a=new Float64Array(radius*2);let sum=0;for(let j=0;j<a.length;j++){const x=(p/phases-(j-radius+1))/step;const w=Math.abs(x)>=8?0:(Math.abs(x)<1e-9?1:Math.sin(Math.PI*x)/(Math.PI*x))*(.5+.5*Math.cos(Math.PI*x/8))/step;a[j]=w;sum+=w;}for(let j=0;j<a.length;j++)a[j]/=sum;return a;});kernels.set(step,table);}
    const center=Math.floor(pos),a=table[Math.min(phases-1,Math.floor((pos-center)*phases))];let value=0;for(let j=0;j<a.length;j++){const at=center+j-radius+1;if(at>=first&&at<=last)value+=sample(source,at)*a[j];};return value;
  }
  function frame(source,r,fraction,n,sr,previous) {
    const re=new Float64Array(n),im=new Float64Array(n), bins=n/2+1;
    const first=r.x0*source.samples.length,last=Math.min(source.samples.length-1,r.x1*source.samples.length-1),center=first+(last-first)*fraction;
    const step=source.sampleRate/sr;
    for(let j=0;j<n;j++){const at=center+(j-n/2)*step;re[j]=(at>=first&&at<=last?bandlimited(source,at,step,first,last):0)*Math.sin(Math.PI*(j+.5)/n);}
    fft(re,im);const mag=new Float64Array(bins),angle=new Float64Array(bins),inst=new Float64Array(bins),env=new Float64Array(bins);
    const delta=(center-(previous?.center??center))/step;
    for(let k=0;k<bins;k++){mag[k]=Math.hypot(re[k],im[k]);angle[k]=Math.atan2(im[k],re[k]);
      inst[k]=k+(previous&&delta>.01?clamp(wrap(angle[k]-previous.angle[k]-TAU*k*delta/n)*n/(TAU*delta),-.5,.5):0);}
    let sum=0;const radius=10;
    for(let k=0;k<bins+radius;k++) {if(k<bins)sum+=Math.log(Math.max(1e-10,mag[k]));if(k>2*radius)sum-=Math.log(Math.max(1e-10,mag[k-2*radius-1]));
      if(k>=radius){const at=k-radius;env[at]=sum/(Math.min(bins-1,k)-Math.max(0,k-2*radius)+1);}}
    const low=freq(r.y1,source.sampleRate),high=freq(r.y0,source.sampleRate);
    let energy=0,count=0,maximum=0,peakBin=0;for(let k=Math.max(1,Math.ceil(low*n/sr));k<Math.min(bins-1,high*n/sr);k++){energy+=mag[k]**2;count++;if(mag[k]>maximum){maximum=mag[k];peakBin=k;}}
    const rms=Math.sqrt(energy/Math.max(1,count));let anchor=null;
    if(maximum>rms*3&&peakBin>1&&peakBin<bins-2){const l=Math.log(Math.max(1e-10,mag[peakBin-1])),m=Math.log(Math.max(1e-10,maximum)),r=Math.log(Math.max(1e-10,mag[peakBin+1]));
      anchor=(peakBin+clamp(.5*(l-r)/(l-2*m+r||1),-.5,.5))*sr/n;
      if(previous?.anchor&&Math.abs(Math.log(anchor/previous.anchor))<.18)anchor=previous.anchor*.65+anchor*.35;
    }
    let rise=0,base=0;for(let k=1;k<bins;k++){base+=mag[k];rise+=Math.max(0,mag[k]-(previous?.mag[k]??mag[k]));}
    const flux=rise/Math.max(1e-8,base);
    return {mag,angle,inst,env,center,low,high,energy:rms,anchor,feature:r.feature??'all',flux};
  }
  function at(a,k){const i=clamp(k,0,a.length-1),lo=Math.floor(i),hi=Math.min(a.length-1,lo+1);return a[lo]+(a[hi]-a[lo])*(i-lo);}
  function read(f,u,n,sr) {const hz=f.low*Math.pow(f.high/f.low,clamp(u,0,1)),k=hz*n/sr;if(u<0||u>1)return {m:0,e:Math.log(1e-10),p:0,d:0,k};
    return {m:at(f.mag,k),e:at(f.env,k),p:at(f.angle,k),d:at(f.inst,k)-k,k};}
  function property(source,target,strength) {
    const feature=source.feature;
    if(feature==='motion')return target.m;
    const meanSource=Math.log(Math.max(source.energy,1e-10)),meanTarget=Math.log(Math.max(target.energy,1e-10));
    const shaped=feature==='resonance'?source.e-meanSource+Math.log(Math.max(target.m,1e-10))-target.e+meanTarget:
      feature==='texture'?target.e+(Math.log(Math.max(source.m,1e-10))-source.e):Math.log(Math.max(source.m,1e-10))-meanSource+meanTarget;
    const base=Math.log(Math.max(target.m,1e-10));return Math.exp(base+clamp(shaped-base,-2.3,2.3)*strength);
  }
  function mapped(f,u,n,sr) {const s=read(f,u,n,sr);s.energy=f.energy;s.feature=f.feature;return s;}
  function key(plan,sources,settings={}) {validate(plan,sources,settings);return JSON.stringify({version,sources:{A:sources.A.revision,B:sources.B.revision},regions:plan.regions,links:plan.links,remainder:plan.remainder,settings:{duration:settings.duration??null,strength:settings.strength??.8}});}
  async function render(plan,sources,settings={},options={}) {
    const job=validate(plan,sources,settings);
    for(const slot of ['A','B'])for(let i=0;i<sources[slot].samples.length;i++){if(!Number.isFinite(sources[slot].samples[i]))throw Error('Donor '+slot+' contains invalid PCM.');if(i%65536===0){if(options.isCancelled?.())throw new DOMException('Hybrid synthesis cancelled.','AbortError');await new Promise(r=>setTimeout(r,0));}}
    const sr=job.sampleRate,length=Math.round(job.duration*sr),n=2048,hop=256,bins=n/2+1;
    const out=new Float64Array(length),weight=new Float64Array(length),phase=new Float64Array(bins),oldMagnitude=new Float64Array(bins);
    const lockedPhase=new Float64Array(bins),rawPhase=new Float64Array(bins),magnitudeFrame=new Float64Array(bins);
    const previous=job.links.map(()=>({A:null,B:null})), previousRemainder={frame:null}, region={x0:0,x1:1,y0:0,y1:1,feature:'all'};
    let frames=0;const check=()=>{if(options.isCancelled?.())throw new DOMException('Dual Donor synthesis cancelled.','AbortError');};check();
    for(let center=0;center<length+n/2;center+=hop) {
      check();const fraction=clamp(center/Math.max(1,length-1),0,1),states=[];
      for(let i=0;i<job.links.length;i++){const l=job.links[i],a=frame(sources.A,l.A,fraction,n,sr,previous[i].A),b=frame(sources.B,l.B,fraction,n,sr,previous[i].B);previous[i]={A:a,B:b};
        const target=l.direction==='B_to_A'?a:b;
        const low=l.mode==='imprint'?target.low:Math.sqrt(a.low*b.low),high=l.mode==='imprint'?target.high:Math.sqrt(a.high*b.high);
        const sharedAnchor=l.mode!=='imprint'&&a.anchor&&b.anchor?Math.sqrt(a.anchor*b.anchor):null;
        const shiftA=sharedAnchor?Math.log(a.anchor/sharedAnchor/(a.low/low))/Math.log(a.high/a.low):0,shiftB=sharedAnchor?Math.log(b.anchor/sharedAnchor/(b.low/low))/Math.log(b.high/b.low):0;
        states.push({l,a,b,low,high,shiftA,shiftB});}
      let rest=null;if(job.remainder!=='linked_only'){const src=sources[job.remainder==='keep_A'?'A':'B'];rest=frame(src,region,fraction,n,sr,previousRemainder.frame);previousRemainder.frame=rest;}
      const re=new Float64Array(n),im=new Float64Array(n);
      for(let k=1;k<bins-1;k++) {
        const hz=k*sr/n;let power=0,parts=0,drift=0,pr=0,pi=0,covered=false,reset=0;
        for(const s of states){if(hz<s.low||hz>s.high)continue;covered=true;const u=Math.log(hz/s.low)/Math.log(s.high/s.low);
          const edge=Math.min(1,u/.04,(1-u)/.04),ua=u+s.shiftA,ub=u+s.shiftB,a=mapped(s.a,ua,n,sr),b=mapped(s.b,ub,n,sr);let m,p,d;
          if(s.l.mode==='imprint') {
            const source=s.l.direction==='A_to_B'?a:b,target=s.l.direction==='A_to_B'?b:a;
            m=property(source,target,job.strength);p=target.p;d=target.d*k/Math.max(1e-5,target.k);
            if(source.feature==='motion'){m*=Math.exp(clamp(Math.log((source.energy+1e-8)/(target.energy+1e-8)),-1.2,1.2)*job.strength);d=(1-job.strength)*d+job.strength*source.d*k/Math.max(1e-5,source.k);}
          } else {
            let aa=a,bb=b;
            if(s.l.mode==='interlock') {
              const eps=.025, slopeA=clamp(read(s.a,ua+eps,n,sr).e-read(s.a,ua-eps,n,sr).e,-2,2),slopeB=clamp(read(s.b,ub+eps,n,sr).e-read(s.b,ub-eps,n,sr).e,-2,2);
              aa=mapped(s.a,ua+slopeB*.035*job.strength,n,sr);bb=mapped(s.b,ub+slopeA*.035*job.strength,n,sr);
            }
            const ew=f=>f==='resonance'?1:f==='all'?.5:0,tw=f=>f==='texture'?1:f==='all'?.5:0;
            const ea=ew(aa.feature),eb=ew(bb.feature),ta=tw(aa.feature),tb=tw(bb.feature);
            const meanA=Math.log(Math.max(aa.energy,1e-10)),meanB=Math.log(Math.max(bb.energy,1e-10));
            const envelope=ea+eb?(ea*(aa.e-meanA)+eb*(bb.e-meanB))/(ea+eb):((aa.e-meanA)+(bb.e-meanB))*.5;
            const fineA=Math.log(Math.max(aa.m,1e-10))-aa.e,fineB=Math.log(Math.max(bb.m,1e-10))-bb.e;
            const wa=ta+tb?ta/(ta+tb):.5,wb=1-wa;
            const detail=.5*Math.log(Math.max(1e-20,wa*Math.exp(clamp(2*fineA,-30,30))+wb*Math.exp(clamp(2*fineB,-30,30))));
            const joint=envelope+detail+(meanA+meanB)*.5, middle=.5*Math.log(Math.max(1e-20,(aa.m*aa.m+bb.m*bb.m)*.5));
            m=Math.exp(clamp(middle+(joint-middle)*job.strength,-30,20));
            if(s.l.mode==='interlock') {
              const difference=Math.log(Math.max(1e-10,aa.m))-aa.e-Math.log(Math.max(1e-10,bb.m))+bb.e;
              const choice=.5+.45*Math.tanh(difference*job.strength);
              const interleaved=Math.sqrt(choice*aa.m*aa.m+(1-choice)*bb.m*bb.m);
              m=m*(1-job.strength*.55)+interleaved*job.strength*.55;
            }p=Math.atan2(Math.sin(aa.p)+Math.sin(bb.p),Math.cos(aa.p)+Math.cos(bb.p));d=(aa.d*k/Math.max(1,aa.k)+bb.d*k/Math.max(1,bb.k))*.5;
          }
          reset=Math.max(reset,s.l.mode==='imprint'?(s.l.direction==='A_to_B'?s.b.flux:s.a.flux):Math.max(s.a.flux,s.b.flux));
          power+=m*m*edge*edge;drift+=d*edge;pr+=Math.cos(p)*m*edge;pi+=Math.sin(p)*m*edge;parts+=edge;
        }
        let magnitude=0,angle=0,deviation=0;
        if(parts>1e-9){magnitude=Math.sqrt(power/Math.max(1,parts));angle=Math.atan2(pi,pr);deviation=drift/parts;}
        else if(rest&&!covered){magnitude=rest.mag[k];angle=rest.angle[k];deviation=rest.inst[k]-k;}
        // Phase belongs to the single shared output field; spectral joins cannot spawn two voices.
        phase[k]=frames&&oldMagnitude[k]>1e-8&&reset<.42?wrap(phase[k]+TAU*(k+deviation)*hop/n):angle;
        rawPhase[k]=angle;magnitudeFrame[k]=magnitude;
      }
      const peaks=[];for(let k=2;k<bins-2;k++)if(magnitudeFrame[k]>1e-8&&magnitudeFrame[k]>magnitudeFrame[k-1]&&magnitudeFrame[k]>=magnitudeFrame[k+1])peaks.push(k);
      for(let k=1,pi=0;k<bins-1;k++){
        while(pi+1<peaks.length&&Math.abs(peaks[pi+1]-k)<Math.abs(peaks[pi]-k))pi++;
        const peak=peaks[pi];lockedPhase[k]=peak!=null&&Math.abs(peak-k)<=8?wrap(phase[peak]+wrap(rawPhase[k]-rawPhase[peak])):phase[k];
        const m=magnitudeFrame[k];re[k]=m*Math.cos(lockedPhase[k]);im[k]=m*Math.sin(lockedPhase[k]);re[n-k]=re[k];im[n-k]=-im[k];oldMagnitude[k]=m;
      }
      fft(re,im,true);
      for(let j=0;j<n;j++){const i=center+j-n/2;if(i<0||i>=length)continue;const w=Math.sin(Math.PI*(j+.5)/n);out[i]+=re[j]*w;weight[i]+=w*w;}
      frames++;if(frames%8===0){options.onProgress?.(clamp(center/length,0,1));await new Promise(r=>setTimeout(r,0));}
    }
    check();const pcm=new Float32Array(length);let peak=0,energy=0;const fade=Math.min(96,length/8);
    for(let i=0;i<length;i++){const edge=clamp(Math.min(i/fade,(length-1-i)/fade),0,1),v=out[i]/Math.max(weight[i],1e-8)*edge;if(!Number.isFinite(v))throw Error('Hybrid contains invalid samples.');pcm[i]=v;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    if(peak<1e-7)throw Error('The linked regions contain no shared audible structure. Widen the marks or choose another relationship.');
    const gain=Math.min(1,.88/peak);if(gain<1)for(let i=0;i<length;i++)pcm[i]*=gain;
    options.onProgress?.(1);
    return {samples:pcm,sampleRate:sr,duration:job.duration,manifest:{schema:'xensonar-dual-donor-result-v1',version,key:key(plan,sources,settings),
      sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:JSON.parse(JSON.stringify(plan)),settings:{duration:job.duration,strength:job.strength},
      alignment:'relative progress within each linked time window',frequencyMapping:'log-relative; Cross/Interlock registered shared band, Imprint target coordinates with scaled phase deviation',phasePolicy:'shared-field-local-peak-lock; observed-transient-reset',revision:41,
      remainder:job.remainder,frames,peakBeforeGain:peak,finalGain:gain,rms:Math.sqrt(energy/length)*gain,addedNoise:0,addedOscillators:0,outputBodies:1}};
  }
  return Object.freeze({version,validate,key,render});
}

const __F35636DualDSPOriginal=__f35636DualDSPFactoryOriginal();
const __F35636DualDSPUpdated=__f35636DualDSPFactory();
const __F35636DualDSP=Object.freeze({
  forPlan:plan=>plan?.revision==='original'?__F35636DualDSPOriginal:__F35636DualDSPUpdated,
  get version(){return 'dual-variant-router-f3.56.42';},
  validate(plan,sources,settings){return this.forPlan(plan).validate(plan,sources,settings);},
  key(plan,sources,settings){return this.forPlan(plan).key(plan,sources,settings);},
  render(plan,sources,settings,options){return this.forPlan(plan).render(plan,sources,settings,options);}
});
const __F35636DualWorker=(()=>{
  function render(plan,sources,settings,options={}){
    __F35636DualDSP.validate(plan,sources,settings);
    const factory=plan?.revision==='original'?__f35636DualDSPFactoryOriginal:__f35636DualDSPFactory;
    const script='const dsp=('+factory.toString()+')();self.postMessage({ready:true});self.onmessage=async e=>{try{const r=await dsp.render(e.data.plan,e.data.sources,e.data.settings,{onProgress:p=>self.postMessage({progress:p})});self.postMessage({result:r},[r.samples.buffer]);}catch(error){self.postMessage({error:error.message,name:error.name});}}';
    const copy=s=>({samples:s.samples.slice(),sampleRate:s.sampleRate,duration:s.duration,revision:s.revision});
    return __F35640OfflineJob.run({script,options,label:'Dual Donor',
      payload:()=>({plan,sources:{A:copy(sources.A),B:copy(sources.B)},settings}),
      transfer:wire=>[wire.sources.A.samples.buffer,wire.sources.B.samples.buffer],
      decode:m=>{if(!(m.result?.samples instanceof Float32Array)||!m.result.samples.length)throw Error('Incomplete hybrid result.');return m.result;}
    }).promise;
  }
  return Object.freeze({render});
})();

/* Session restoration contains real PCM, not merely source filenames. */
const __F35636DualStore=(()=>{
  let opening=null;
  function open(){if(opening)return opening;opening=new Promise((resolve,reject)=>{let request;
    try{request=indexedDB.open('xensonar-dual-donor-material-f35636',1);}catch(e){reject(e);return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('sessions'))request.result.createObjectStore('sessions');};
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};
    request.onerror=()=>{opening=null;reject(request.error||Error('Session storage unavailable.'));};});opening=opening.catch(e=>{opening=null;throw e;});return opening;}
  async function read(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),r=tx.objectStore('sessions').get('current');let value=null;r.onsuccess=()=>{value=r.result??null;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Session read cancelled.'));});}
  async function write(value){const db=await open();const sources=Object.fromEntries(['A','B'].map(slot=>{const s=value.sources?.[slot];return [slot,s?{...s,samples:s.samples.slice()}:null];}));return new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put({...value,sources},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Session save cancelled.'));});}
  return Object.freeze({read,write});
})();
function __f35636Asset(result,name) {
  const pcm=result.samples, duration=pcm.length/result.sampleRate;
  return {id:'dual-'+result.revision,kind:'audio',fileName:(name||'Hybrid Donor')+'.wav',sampleRate:result.sampleRate,monoSamples:pcm,leftSamples:pcm,rightSamples:pcm,
    midSamples:pcm,sideSamples:new Float32Array(pcm.length),channelCount:1,numberOfChannels:1,
    waveformPreview:E4e(pcm,1024),stereoWidthPreview:new Float32Array(1024),
    durationSec:duration,originalDuration:duration,importStartSec:0,importDurationSec:duration,
    dualDonorManifest:result.manifest,contentRevision:result.revision};
}
function __f35636Wav(source){const samples=source.samples,buffer=new ArrayBuffer(44+samples.length*4),v=new DataView(buffer);const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+samples.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,1,true);
  v.setUint32(24,source.sampleRate,true);v.setUint32(28,source.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,32,true);str(36,'data');v.setUint32(40,samples.length*4,true);
  for(let i=0;i<samples.length;i++)v.setFloat32(44+i*4,samples[i],true);return new Blob([buffer],{type:'audio/wav'});
}
function __f35636Download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-z0-9._ -]/gi,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function __f35636PortableRevision(bytes){let a=2166136261,b=2246822519;for(let i=0;i<bytes.length;i++){a=Math.imul(a^bytes[i],16777619);b=Math.imul(b^bytes[i],3266489917);}return 'pcm64:'+bytes.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}
async function __f35636RevisionMatches(bytes,expected,sr=null,count=null){
 if(typeof expected!=='string')return false;if(expected.startsWith('pcm64:'))return __f35636PortableRevision(bytes)===expected;
 const digest=await __f35635Digest(bytes);return (sr==null?digest:digest+':'+sr+':'+count)===expected;
}
async function __f35636SessionFile(value){
  const entries=[];for(const slot of ['A','B','result']){const s=slot==='result'?value.result:value.sources[slot];if(s)entries.push({slot,sampleRate:s.sampleRate,length:s.samples.length,revision:s.revision,duration:s.duration,pcmRevision:__f35636PortableRevision(new Uint8Array(s.samples.buffer,s.samples.byteOffset,s.samples.byteLength))});}
  const grid=value.carrier?.spectralSnapshot?new Float32Array(value.carrier.spectralSnapshot):null;
  if(grid)entries.push({slot:'carrier-grid',length:grid.length,pcmRevision:__f35636PortableRevision(new Uint8Array(grid.buffer))});
  const encoder=new TextEncoder(),header=encoder.encode(JSON.stringify({schema:'xensonar-dual-donor-session-v2',plan:value.plan,settings:value.settings,
    carrier:value.carrier?{...value.carrier,spectralSnapshot:null}:null,workbench:value.workbench??null,combination:value.combination??null,stateContractVersion:3,renderContext:value.renderContext??null,resultManifest:value.result?.manifest??null,resultRevision:value.result?.revision??null,
    pcm:entries}));
  const size=new ArrayBuffer(4);new DataView(size).setUint32(0,header.length,true);return new Blob([new Uint8Array([88,68,83,49]),size,header,...['A','B','result'].map(slot=>slot==='result'?value.result?.samples:value.sources[slot]?.samples).filter(Boolean),...(grid?[grid]:[])],{type:'application/octet-stream'});
}
async function __f35636ReadSession(file){
  if(file.size>72*1024*1024||file.size<12)throw Error('Invalid session size.');const bytes=await file.arrayBuffer(),v=new DataView(bytes);
  if(v.getUint32(0,false)!==0x58445331)throw Error('Not a Dual Donor audio session.');const len=v.getUint32(4,true);if(len>12*1024*1024||len+8>bytes.byteLength)throw Error('Invalid session header.');
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,8,len)));if(!['xensonar-dual-donor-session-v1','xensonar-dual-donor-session-v2'].includes(h.schema))throw Error('Unsupported audio session.');
  const sources={A:null,B:null},slots=new Set();let result=null,at=8+len;
  for(const p of h.pcm){const grid=p.slot==='carrier-grid';if(!['A','B','result','carrier-grid'].includes(p.slot)||!Number.isSafeInteger(p.length)||p.length<(grid?1:256)||p.length>12000000||(!grid&&!(p.sampleRate>=8000&&p.sampleRate<=192000))||at+p.length*4>bytes.byteLength)throw Error('Invalid session audio.');
    if(slots.has(p.slot))throw Error('Duplicate session audio.');slots.add(p.slot);
    const samples=new Float32Array(bytes.slice(at,at+p.length*4));at+=p.length*4;for(const x of samples)if(!Number.isFinite(x))throw Error('Session contains invalid audio.');
    if(grid){if(!h.carrier||!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision)))throw Error('Carrier figure does not match its content revision.');h.carrier.spectralSnapshot=samples;continue;}
    const source={samples,sampleRate:p.sampleRate,duration:p.length/p.sampleRate,revision:p.revision};
    if(!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision,p.sampleRate,p.length)))throw Error('Session audio does not match its saved content revision.');
    if(p.slot==='result')result={...source,manifest:h.resultManifest};else sources[p.slot]=source;
  }
  if(at!==bytes.byteLength)throw Error('Unexpected trailing session data.');
  if(!sources.A||!sources.B)throw Error('Session needs both original donor recordings.');
  if(result&&(!h.resultManifest?.recipe||!Array.isArray(h.resultManifest.recipe.links)||typeof h.resultManifest.key!=='string'))throw Error('Completed audio has no valid saved render recipe.');
  if(result)result.manifest={...result.manifest,recipe:__f35634Clean(result.manifest.recipe)};
  const plan=__f35634Clean({...h.plan,revision:h.plan?.revision??(h.resultManifest?.version==='dual-donor-spectral-body-f3.56.36'?'original':'revised')});
  // Assess freshness BEFORE source revisions are rebound to the verified imported PCM.
  // A completed old render stays available even if today's draft cannot be rendered yet.
  let current=false;
  if(result&&h.resultManifest){try{
    current=h.resultManifest.version===__F35636DualDSP.forPlan(plan).version&&
      h.resultManifest.key===__F35636DualDSP.key(plan,sources,h.settings??{});
  }catch{/* An incomplete or edited draft does not invalidate the old audio itself. */}}
  for(const slot of ['A','B']){const revision=await __f35635PCMRevision(sources[slot]);
    // Session files bind marks to the actual imported PCM, not to a carried-over label.
    sources[slot].revision=revision;plan.sources[slot]={...plan.sources[slot],kind:'file',id:'session:'+revision,revision};}
  if(result){result.revision=await __f35635PCMRevision(result);
    result.manifest=current?{...result.manifest,key:__F35636DualDSP.key(plan,sources,h.settings??{}),sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:plan}:
      {...result.manifest,key:'last-render:'+(result.manifest?.key??result.revision)};}
  return {plan,sources,result,settings:h.settings,carrier:h.carrier,workbench:h.workbench,combination:h.combination,renderContext:h.renderContext??null};
}

/* F3.56.38: rehydrate the original Material Intake audio contract at the library boundary.
 * Previously saved F3.56.36/37 hybrid records lack waveformPreview and kind. They must
 * not be deleted, silently ignored, or rendered as if those fields existed. */
const __F35638DonorBridge=(()=>{
 const library=__DonorLibraryF36.donorLibrary;
 const originalLoad=library.load.bind(library);
 function asset(raw){
  const pcm=raw?.monoSamples?.length?raw.monoSamples:raw?.leftSamples;
  if(!(pcm?.length>0)||!(raw.sampleRate>=8000))throw Error('Saved donor is missing readable PCM.');
  const preview=raw.waveformPreview?.length?raw.waveformPreview:E4e(pcm,1024);
  const stereo=raw.stereoWidthPreview?.length?raw.stereoWidthPreview:new Float32Array(preview.length);
  return {...raw,kind:'audio',channelCount:raw.channelCount??raw.numberOfChannels??1,
   originalDuration:raw.originalDuration??pcm.length/raw.sampleRate,
   importStartSec:raw.importStartSec??0,importDurationSec:raw.importDurationSec??pcm.length/raw.sampleRate,
   waveformPreview:preview,stereoWidthPreview:stereo};
 }
 function entryFromAsset(raw,name,selection=null){
  const clean=asset(raw),duration=clean.originalDuration;
  // Legacy F3.56.36/37 hybrids saved only fineLoopRange. The normal Material Intake
  // navigator also requires detailViewport; lacking it could crash React render.
  const limit=(value,fallback)=>Number.isFinite(value)?Math.max(0,Math.min(duration,value)):fallback;
  const view=selection?.detailViewport??{startSec:0,durationSec:duration};
  const mask=selection?.fineLoopRange??{startSec:0,durationSec:duration};
  const from=limit(mask.startSec,0),to=Math.max(0.025,Math.min(duration-from,limit(mask.durationSec,duration)));
  const viewStart=limit(view.startSec,0),viewDuration=Math.max(0.025,Math.min(duration-viewStart,limit(view.durationSec,duration)));
  return {source:{id:clean.id||'dual-hybrid',kind:'audio',label:name||clean.fileName||'Hybrid donor',
   durationSec:duration,waveformPreview:clean.waveformPreview,sourceAsset:clean},
   selection:{...selection,detailViewport:{startSec:viewStart,durationSec:viewDuration},fineLoopRange:{startSec:from,durationSec:to}},
   readMode:'hybrid',sourceAdapterId:'local-file'};
 }
 library.load=async id=>{
  const entry=await originalLoad(id),prepared=entryFromAsset(entry.source?.sourceAsset,
   entry.source?.label||entry.name,entry.selection);
  return {...entry,source:{...entry.source,...prepared.source},selection:prepared.selection,
   sourceAdapterId:entry.sourceAdapterId==='dual-donor-spectral'?'local-file':entry.sourceAdapterId??'local-file'};
 };
 // The originating library functions remain responsible for persistence and validation.
 // Normalization is a read-only compatibility projection, not an automatic migration.
 return Object.freeze({asset,entryFromAsset});
})();

function __F35636Output({body,current,problem,settings,onSettings,job,onRender,onCancel,onListen,audition,onSave,onUse,onExport,onExportSession,onImportSession,sessionImport,savedFigure,onRestore,audioSaved}) {
 return u.jsxs('section',{className:'f35636-output','aria-label':'Hybrid donor output',children:[
  u.jsx('div',{className:'f35634-overline',children:'04 / SHARED SOUND BODY'}),u.jsx('h3',{children:'Build a donor. Give it a figure.'}),
  u.jsx('p',{children:'Linked time windows follow the same relative progress. Cross finds a spectral middle; Imprint reshapes the target; Interlock bends each structure through the other. The result is one new donor.'}),
  u.jsxs('div',{className:'f35636-controls',children:[
   u.jsxs('label',{children:['Body duration (s)',u.jsx('input',{type:'number','aria-label':'Hybrid duration',min:.1,max:8,step:.1,value:settings.duration,onChange:e=>onSettings({...settings,duration:Number(e.currentTarget.value)})})]}),
   u.jsxs('label',{children:['Relationship strength · '+Math.round(settings.strength*100)+'%',u.jsx('input',{type:'range','aria-label':'Relationship strength',min:0,max:1,step:.01,value:settings.strength,onChange:e=>onSettings({...settings,strength:Number(e.currentTarget.value)})})]})]}),
  problem?u.jsx('p',{className:'f35636-status',children:problem}):null,
  body&&!current?u.jsx('p',{className:'f35636-status',children:'Changes pending. The last completed hybrid remains available to hear or export. Build again for the current recipe.'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',disabled:!!problem||job.busy,onClick:onRender,children:job.busy?job.label:'Build Hybrid Donor'}),job.busy?u.jsx('button',{type:'button',onClick:onCancel,children:'Cancel'}):null]}),
  job.busy?u.jsx('progress',{max:1,value:job.progress,'aria-label':'Hybrid preparation progress'}):null,
  body?u.jsx('p',{role:'status',children:'Ready · '+body.duration.toFixed(2)+' s · '+body.manifest.recipe.links.length+' relationship(s) · one sound body'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onListen,children:audition?.slot==='result'?'■ Stop Hybrid':'▶ Hear Hybrid'}),
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onExport,children:'Export Hybrid WAV'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onSave,children:'Save to Donor Library'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onUse,children:'Use hybrid in Forge ▶ Hear Carrier'})]}),
  u.jsx('p',{className:'f35636-small',children:'Articulation lets your drawing lead onset, duration, pitch and silence. The donor contributes its observed beginning, body and ending. Carrier transfer is an explicit action.'}),
  u.jsxs('details',{children:[u.jsx('summary',{children:'Keep this experiment · original audio and figure'}),
   u.jsx('p',{children:audioSaved||'A complete session includes original recordings, marks, relationships, settings and the saved carrier. Blueprint JSON contains no audio.'}),
   u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',onClick:onExportSession,children:'Export complete session'}),u.jsx('button',{type:'button',onClick:()=>sessionImport.current?.click(),children:'Import complete session'}),u.jsx('button',{type:'button',disabled:!savedFigure,onClick:onRestore,children:'Restore saved figure'}),u.jsx('input',{ref:sessionImport,type:'file',accept:'.xds',hidden:true,onChange:e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void onImportSession(file)}})]})]})
 ]});
}


const __F35634Key='xensonar:dual-donor-blueprint:f35635:v2';
const __F35634LegacyKey='xensonar:dual-donor-blueprint:f35634:v1';