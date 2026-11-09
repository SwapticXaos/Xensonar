import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
const htmlPath=process.argv[2]||'dist/index.html';
let html = fs.readFileSync(htmlPath,'utf8')
 .replace(/import\.meta\.url/g,'"https://xensonar.local/dist/index.html"')
 .replace('<script type="module" crossorigin>','<script>')
 .replace('<script>','<div id="root"></div><script>')
 .replace('<div id="root"></div>\n  </body>','</body>');
const errors=[]; const logs=[];
const vc=new VirtualConsole();
vc.on('error', (...args)=>errors.push(['console.error',...args.map(String)].join(' ')));
vc.on('warn', (...args)=>logs.push(['console.warn',...args.map(String)].join(' ')));
vc.on('jsdomError', (e)=>errors.push('jsdomError: '+(e?.stack||e?.message||String(e))));
const dom = new JSDOM(html, {url:'https://xensonar.local/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
 beforeParse(window){
  window.URL.createObjectURL=()=>'blob:xensonar-test'; window.URL.revokeObjectURL=()=>{};
  window.matchMedia=()=>({matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false;}});
  window.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}}; window.IntersectionObserver=class{observe(){} unobserve(){} disconnect(){}};
  window.requestAnimationFrame=(cb)=>window.setTimeout(()=>cb(Date.now()),16); window.cancelAnimationFrame=(id)=>window.clearTimeout(id);
  Object.defineProperty(window.HTMLElement.prototype,'innerText',{get(){return this.textContent||''}, set(v){this.textContent=v}});
  window.HTMLCanvasElement.prototype.getContext=function(type){return {canvas:this, fillRect(){}, clearRect(){}, getImageData(){return {data:new Uint8ClampedArray(4)}}, putImageData(){}, createImageData(){return []}, setTransform(){}, resetTransform(){}, drawImage(){}, save(){}, fillText(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, stroke(){}, translate(){}, scale(){}, rotate(){}, arc(){}, arcTo(){}, ellipse(){}, fill(){}, rect(){}, roundRect(){}, bezierCurveTo(){}, quadraticCurveTo(){}, clip(){}, measureText(){return {width:0}}, createLinearGradient(){return {addColorStop(){}}}, createRadialGradient(){return {addColorStop(){}}}, strokeRect(){}, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'left',globalAlpha:1};};
  class Param { constructor(v=0){this.value=v;} setValueAtTime(v){this.value=v;} linearRampToValueAtTime(v){this.value=v;} exponentialRampToValueAtTime(v){this.value=v;} setTargetAtTime(v){this.value=v;} cancelScheduledValues(){} cancelAndHoldAtTime(){} }
  class Node { constructor(){this.gain=new Param(1); this.frequency=new Param(440); this.detune=new Param(0); this.Q=new Param(1); this.delayTime=new Param(0); this.playbackRate=new Param(1); this.pan=new Param(0); this.buffer=null; this.type='sine';} connect(){return this;} disconnect(){} start(){} stop(){} }
  class AudioCtx { constructor(){this.currentTime=0; this.destination=new Node(); this.state='running'; this.sampleRate=44100; this.audioWorklet={addModule(){return Promise.resolve();}};} resume(){this.state='running';return Promise.resolve();} suspend(){this.state='suspended';return Promise.resolve();} close(){return Promise.resolve();} createGain(){return new Node();} createOscillator(){return new Node();} createBiquadFilter(){return new Node();} createBuffer(ch,len,sr){return {length:len, numberOfChannels:ch, sampleRate:sr, duration:len/sr, getChannelData(){return new Float32Array(len)}};} createBufferSource(){return new Node();} createAnalyser(){let n=new Node(); n.fftSize=2048; n.frequencyBinCount=1024; n.getByteFrequencyData=()=>{}; n.getByteTimeDomainData=()=>{}; return n;} createDelay(){return new Node();} createWaveShaper(){return new Node();} createStereoPanner(){return new Node();} createDynamicsCompressor(){let n=new Node(); n.threshold=new Param(-24); n.knee=new Param(30); n.ratio=new Param(12); n.attack=new Param(0.003); n.release=new Param(0.25); return n;} createConvolver(){return new Node();} createConstantSource(){let n=new Node(); n.offset=new Param(1); return n;} createChannelMerger(){return new Node();} createChannelSplitter(){return new Node();} createPanner(){return new Node();} }
  window.AudioContext=AudioCtx; window.webkitAudioContext=AudioCtx;
 }
});
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
await wait(3000);
function text(){return dom.window.document.body?.innerText || dom.window.document.body?.textContent || '';}
console.log('initial errors', errors.slice(0,5));
console.log('initial text', text().slice(0,500).replace(/\s+/g,' '));
const btns=[...dom.window.document.querySelectorAll('button')];
const power=btns.find(b=>(b.textContent||'').trim()==='Power');
console.log('buttons', btns.length, 'power?', !!power, power?.textContent);
if(power){ power.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true, cancelable:true})); }
await wait(1000);
console.log('after text', text().slice(0,800).replace(/\s+/g,' '));
console.log('errors', errors.slice(0,30));
console.log('body len', text().length);
if(errors.length) process.exitCode=2;
