const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>fs.readFileSync(require('node:path').join(root,p),'utf8');
const keyboard=read('src/rhythm/04_workspace_and_transport.js');
const particle=read('src/rhythm/03_live_drum_bodies.js');
const bass=read('src/runtime/instrument/12_rhythm_and_bass_editor.js');
const backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
const shell=read('src/app/forge/01_room_shell.js');
const f=(src,name,context={})=>{const m=src.match(new RegExp(`function ${name}\\(`));assert(m,`missing function ${name}`);let start=m.index,opening=src.indexOf('{',start),depth=0,i=opening,quoted=null,escape=false;
 for(;i<src.length;i++){const c=src[i];if(quoted){if(escape){escape=false;continue}if(c==='\\'){escape=true;continue}if(c===quoted)quoted=null;continue}if('"\'`'.includes(c)){quoted=c;continue}if(c==='{')depth++;else if(c==='}'&&--depth===0)break}
 return vm.runInNewContext(`(${src.slice(start,i+1)})`,{...context});};
const mode=f(keyboard,'fPe',{hPe:(system,mode,delta)=>({ionian:'dorian',dorian:'ionian'}[mode]||'ionian')});
for(const k of ['m','n']){let selected='', prevented=false;const action=mode({event:{key:k},params:{particleSystem:'ji',churchMode:'ionian'},setChurchMode:v=>selected=v,cycleParticleSystem:()=>assert.fail('N/M may not change tuning'),preventDefault:()=>prevented=true});assert(action&&prevented&&selected,'N/M must cycle a particle mode');}
assert(keyboard.indexOf('if(!n.repeat&&(K==="-"||K==="_")&&fPe(')<keyboard.indexOf('if(dPe({event:n,key:K'),'Minus must be routed before the competing keyboard-shift shortcut');
assert(particle.includes('r.agentEnabled?.[i]')||particle.includes('r.agentEnabled[i]'), 'Canvas does not use particle mute mask — inactive particles still bright');
assert(backend.includes('function __f35655StretchParticleTonePlan('),'No independent held-particle sustain');
const stretch=f(backend,'__f35655StretchParticleTonePlan');
const original={introTones:[{dur:.1}],mainTones:[{dur:.24},{dur:1.5}],noiseAccentVolumeScale:null};
const normal=stretch(original,false);assert.strictEqual(normal,original,'No normal tone may be changed');
const held=stretch(original,true);assert(held.mainTones[0].dur>1&&held.mainTones[1].dur>1.5,'Held tone must last longer');assert(held.mainTones.every(v=>v.dur<=4.6),'Held tone must be bounded');assert.equal(held.introTones[0].dur,.1,'Attack must remain unchanged');assert.equal(original.mainTones[0].dur,.24,'No mutation');
assert(backend.includes('sustainExtended:e.longToneHoldRef?.current===!0'),'Particle dispatcher cannot see sustain key');
assert(shell.includes('longToneHoldRef:Sm,allowSecondaryStart'),'Main-room hold reference not wired into particle dispatcher');
assert(!bass.includes("window.prompt('Save Bass Pattern As'"),'Bass save-as must not prompt again');
assert(bass.includes('const name=B.trim()'),'Bass save must use the visible name input');
const layout=read('styles/19_bass_manager_fix.css');assert(layout.includes('max-width: min(96rem, calc(100vw - 2rem))'),'Bass manager outer width still cramped');
assert(bass.includes('\"data-bass-body-canvas\":\"true\"')&&layout.includes('height: 16rem'),'Bass note body height must increase');
assert(layout.includes('minmax(32rem,1.70fr)'),'Bass body column must get more space');
console.log('PASS f355 hotkeys, visual mute, held tones, bass save + geometry');
