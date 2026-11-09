import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
const htmlPath = process.argv[2];
let html = fs.readFileSync(htmlPath, 'utf8')
  .replace(/import\.meta\.url/g, '"https://xensonar.local/dist/index.html"')
  .replace('<script type="module" crossorigin>', '<script>')
  .replace('<script>', '<div id="root"></div><script>')
  .replace('<div id="root"></div>\n  </body>', '</body>');
const errors=[]; const logs=[];
const vc = new VirtualConsole();
vc.on('error', (...args)=>errors.push(['console.error', ...args.map(String)].join(' ')));
vc.on('warn', (...args)=>logs.push(['console.warn', ...args.map(String)].join(' ')));
vc.on('jsdomError', (e)=>errors.push('jsdomError: '+(e?.message||String(e))));
const dom = new JSDOM(html, {
  url:'https://xensonar.local/',
  runScripts:'dangerously',
  resources:'usable',
  pretendToBeVisual:true,
  virtualConsole: vc,
  beforeParse(window) {
    window.URL.createObjectURL = ()=>'blob:xensonar-test';
    window.URL.revokeObjectURL = ()=>{};
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false;} });
    window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.requestAnimationFrame = (cb)=>window.setTimeout(()=>cb(Date.now()),16);
    window.cancelAnimationFrame = (id)=>window.clearTimeout(id);
    window.HTMLCanvasElement.prototype.getContext = function(type){ return {
      canvas:this, fillRect(){}, clearRect(){}, getImageData(){ return { data:new Uint8ClampedArray(4) }; }, putImageData(){}, createImageData(){return []},
      setTransform(){}, resetTransform(){}, drawImage(){}, save(){}, fillText(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, stroke(){}, translate(){}, scale(){}, rotate(){}, arc(){}, arcTo(){}, ellipse(){}, fill(){}, rect(){}, roundRect(){}, bezierCurveTo(){}, quadraticCurveTo(){}, clip(){}, measureText(){return {width:0}}, createLinearGradient(){return {addColorStop(){}}}, createRadialGradient(){return {addColorStop(){}}}, strokeRect(){},
      fillStyle:'', strokeStyle:'', lineWidth:1, font:'', textAlign:'left', globalAlpha:1,
    }; };
    class AudioCtx { constructor(){ this.currentTime=0; this.destination={}; this.state='running'; this.sampleRate=44100; } resume(){return Promise.resolve();} suspend(){return Promise.resolve();} close(){return Promise.resolve();} createGain(){return {gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}}, connect(){return this}, disconnect(){}};} createOscillator(){return {frequency:{value:440,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}}, type:'sine', start(){}, stop(){}, connect(){return this}, disconnect(){}};} createBiquadFilter(){return this.createGain();} createBuffer(){return {getChannelData(){return new Float32Array(1)}};} createBufferSource(){return {buffer:null, playbackRate:{value:1,setValueAtTime(){}}, start(){}, stop(){}, connect(){return this}, disconnect(){}};} createAnalyser(){return this.createGain();} createDelay(){return this.createGain();} createWaveShaper(){return this.createGain();} createStereoPanner(){return this.createGain();} }
    window.AudioContext = AudioCtx; window.webkitAudioContext = AudioCtx;
  }
});
await new Promise(r=>setTimeout(r, 3000));
const text = dom.window.document.body?.innerText || '';
const syntheticCaught = /SyntheticForge abgefangen|SyntheticForge ist in einen Fehler gelaufen|prepareMelodicWorkspaceArchiveDownload is not defined/.test(text + '\n' + errors.join('\n'));
console.log(JSON.stringify({
  textStart:text.slice(0,1000),
  buttonCount:dom.window.document.querySelectorAll('button').length,
  syntheticCaught,
  errors:errors.slice(0,20),
}, null, 2));
if (syntheticCaught) process.exit(2);
if (errors.some(e=>/prepareMelodicWorkspaceArchiveDownload is not defined/.test(e))) process.exit(3);
process.exit(0);
