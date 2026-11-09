import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://xensonar.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
Object.assign(globalThis, {
  window, document: window.document,
  HTMLElement: window.HTMLElement, HTMLCanvasElement: window.HTMLCanvasElement,
  Blob: window.Blob, File: window.File, CustomEvent: window.CustomEvent,
  Event: window.Event, MouseEvent: window.MouseEvent, KeyboardEvent: window.KeyboardEvent,
  URL: window.URL, localStorage: window.localStorage, sessionStorage: window.sessionStorage,
  requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
});
window.HTMLCanvasElement.prototype.getContext = function(type){ const canvas=this; const target={ canvas, measureText(){return {width:10}}, getImageData(){return {data:new Uint8ClampedArray(4)}}, createImageData(){return {data:new Uint8ClampedArray(4)}}, createLinearGradient(){return {addColorStop(){}}}, createRadialGradient(){return {addColorStop(){}}} }; return new Proxy(target,{ get(obj,prop){ if (prop in obj) return obj[prop]; if (typeof prop === 'string') { obj[prop]=()=>{}; return obj[prop]; } return undefined; }, set(obj,prop,value){ obj[prop]=value; return true; } }); };
window.URL.createObjectURL = () => 'blob:dummy'; window.URL.revokeObjectURL = () => {};
globalThis.AudioContext = class { constructor(){ this.currentTime=0; this.destination={}; this.sampleRate=44100; } createGain(){ return { gain:{ value:1, setValueAtTime(){}, linearRampToValueAtTime(){} }, connect(){}, disconnect(){} }; } createOscillator(){ return { frequency:{value:440,setValueAtTime(){}}, type:'sine', connect(){}, start(){}, stop(){}, disconnect(){} }; } createBuffer(){return {duration:1,numberOfChannels:1,sampleRate:44100,getChannelData(){return new Float32Array(44100)}}} decodeAudioData(arr){return Promise.resolve(this.createBuffer(1,44100,44100));} createBufferSource(){return {buffer:null, playbackRate:{value:1,setValueAtTime(){}}, connect(){}, start(){}, stop(){}, disconnect(){}}} resume(){return Promise.resolve();} close(){return Promise.resolve();} };
globalThis.OfflineAudioContext = globalThis.AudioContext;
window.AudioContext = globalThis.AudioContext; window.OfflineAudioContext = globalThis.OfflineAudioContext;

const server = await createServer({ logLevel:'error', server:{middlewareMode:true}, appType:'custom', optimizeDeps:{noDiscovery:true, entries:[]} });
try {
 const { CanonicalForgeRoom } = await server.ssrLoadModule('/src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
 const { registerMaterialExport } = await server.ssrLoadModule('/src/features/l3lab/materialLibrary.ts');
 const wav = new window.Blob([new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69])], { type:'audio/wav' });
 registerMaterialExport({ name:'Dummy Runtime Material', role:'loop', bpm:108, bars:2, guideSegments:4, guideMarkers:[], loopStartSec:0, loopEndSec:4, rootHz:55, sourceVersion:'test', renderMode:'dummy-runtime', durationSec:4, intendedLoopDurationSec:4 }, wav);
 const root = createRoot(document.getElementById('root'));
 root.render(React.createElement(CanonicalForgeRoom, { onBack:()=>{} }));
 await new Promise(r=>setTimeout(r,500));
 function findBtn(txt){ return [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(txt)); }
 console.log('initial text', document.body.textContent.slice(0,1000));
 const btn = findBtn('Materialspur importieren');
 console.log('button', !!btn, btn?.textContent, btn?.disabled);
 btn?.dispatchEvent(new window.MouseEvent('click', { bubbles:true, cancelable:true }));
 await new Promise(r=>setTimeout(r,700));
 console.log('after click text', document.body.textContent.slice(0,3000));
 console.log('has dialog', document.body.textContent.includes('Material in Melodic Loop legen') || document.body.textContent.includes('Materialspuren Verwalten'));
 console.log('dummy visible', document.body.textContent.includes('Dummy Runtime Material'));
} finally { await server.close(); }
