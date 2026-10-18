'use strict';
// Read back the delivered PCM16 WAVs: plots represent exactly those signals.
const fs=require('fs'),vm=require('vm'),path=require('path'),ctx={setTimeout,DOMException};vm.createContext(ctx);
for(const f of ['src/forge/dsp/01_material_tools.js','src/forge/fractalia/13_spectral_view.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
vm.runInContext('globalThis.measure=measureFractaliaSpectrum;globalThis.pixels=fractaliaSpectrumPixels;',ctx);
(async()=>{for(const source of ['vowel','metal']){
 const spectra={};for(const label of ['reference','near','one','branch']){const bytes=fs.readFileSync('examples/f43/'+source+'_'+label+'.wav'),sr=bytes.readUInt32LE(24),samples=Float32Array.from({length:(bytes.length-44)/2},(_,i)=>bytes.readInt16LE(44+i*2)/32768);spectra[label]=await ctx.measure({samples,sampleRate:sr})}
 const maximum=Math.max(...Object.values(spectra).map(s=>s.maximum));
 for(const [label,spectrum] of Object.entries(spectra)){const p=ctx.pixels({...spectrum,maximum},{...spectra.reference,maximum},label==='reference'?'reference':'compare'),stem='examples/f43/'+source+'_'+label;fs.writeFileSync(stem+'.rgba',Buffer.from(p.data));fs.writeFileSync(stem+'_image.json',JSON.stringify({width:p.width,height:p.height,maximum,origin:'decoded-delivered-PCM16-WAV',durationSec:spectrum.durationSec}));}
 }console.log('PASS all comparison pictures measured from delivered WAV PCM');})().catch(e=>{console.error(e);process.exitCode=1});
