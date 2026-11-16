'use strict';
// AUDIO-ANALYSE-01 (real app, Wave Editor): "Analyse Tempo · Root · Scale" reports tempo, root Hz, tuning and scale with accuracy values for the
// purple selection (caret only = whole file), at most 2 minutes; it only reads (no edit), cancels, refuses < 4 s, notices edits made meanwhile,
// and says "not determined" for noise. Nothing of it lives in the Spectral Forge rack.
// Usage: node tests/e2e/audio_analysis.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {render,rng,wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-analysis-'));
const music=path.join(dir,'a_minor_120.wav'),noise=path.join(dir,'noise.wav');
fs.writeFileSync(music,wav(render({sr:22050,dur:150,bpm:120,rootHz:110,scale:[0,200,300,500,700,800,1100]}),22050));
{const R=rng(7),n=new Float32Array(22050*12);for(let i=0;i<n.length;i++)n[i]=(R()*2-1)*.3;fs.writeFileSync(noise,wav(n,22050));}
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 const openEditor=async (file,forgeCheck)=>{await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);if(forgeCheck){const tc=p.locator('.xen-carrier-transform');await tc.scrollIntoViewIfNeeded();await tc.click();await p.waitForFunction(()=>/pitch lines imported/.test(document.querySelector('.xen-carrier-transform')?.title||''),null,{timeout:90000});await wb.scrollIntoViewIfNeeded();}await wb.click();await p.waitForSelector('[data-xwe-tonal-analysis]',{timeout:30000})};
 const btn=p.locator('[data-xwe-tonal-analysis]'),out=p.locator('[data-xwe-tonal-result]');
 const revision=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;for(const c of document.querySelectorAll('canvas')){try{const d=x.getEditor(c)?.doc;if(d?.frames)return d.revision}catch{}}return null});
 const done=()=>p.waitForFunction(()=>/Tempo:|failed|canceled|Select at least|edited during/.test(document.querySelector('[data-xwe-tonal-result]')?.textContent||''),null,{timeout:120000});
 const field=async(label,v)=>{const i=p.locator(`input[aria-label="${label}"]`).first();await i.fill(String(v));await i.dispatchEvent('change');await p.waitForTimeout(300)};
 const value=(t,l)=>(t.match(new RegExp('^'+l+': ([\\d.]+)','m'))||[])[1];
 await openEditor(music,true);
 assert.equal(await p.locator('.xen-analysis-tile').count(),0,'nothing of the analysis sits in the Forge rack');assert.equal(await p.locator('.xen-carrier-transform').count(),1,'Transform to Carrier is untouched');
 const rev0=await revision();
 // ---- the purple selection the editor opens with ----
 await btn.scrollIntoViewIfNeeded();await btn.click();await done();let t=await out.innerText();
 assert.ok(Math.abs(Number(value(t,'Tempo'))-120)<1.5,'BPM '+t);assert.ok(Math.abs(Number(value(t,'Root'))-55)<.7,'root '+t);
 assert.match(t,/Root: 5[45]\.\d+ Hz = A1/);assert.match(t,/Tuning: 12-EDO/);assert.match(t,/Scale: (Harmonic|Natural) minor/);assert.ok((t.match(/accuracy \d+ %/g)||[]).length>=4,'each value carries an accuracy: '+t);
 assert.match(t,/^Selection 0:00–0:0\d/m);assert.equal(await revision(),rev0,'reading changes nothing');
 // ---- 10 s .. 2:20 = 130 s: capped at the first 2:00 ----
 await field('End s',140);await field('Start s',10);await btn.click();await done();t=await out.innerText();
 assert.match(t,/^Selection 0:10–2:10 · the first 2:00 of the 2:10 range \(the limit is 2:00 per analysis\)/m,t.split('\n')[0]);
 assert.ok(Math.abs(Number(value(t,'Tempo'))-120)<1.5);assert.match(t,/Scale: .*minor/);assert.doesNotMatch(t,/^\d:\d\d–\d:\d\d:/m,'one key: no sections');
 assert.equal(await revision(),rev0);
 // ---- too short ----
 await field('Start s',0);await field('End s',2);await btn.click();await done();assert.match(await out.innerText(),/at least 4 seconds/);
 // ---- cancel while running ----
 await field('Start s',0);await field('End s',140);await btn.click();await p.waitForFunction(()=>/Cancel/.test(document.querySelector('[data-xwe-tonal-analysis]').innerText),null,{timeout:5000});await btn.click();await done();
 assert.match(await out.innerText(),/canceled/);assert.match(await btn.innerText(),/Analyse Tempo/);
 // ---- an edit made while it runs: the old answer is not shown for the new audio ----
 await btn.click();await p.waitForFunction(()=>/Cancel/.test(document.querySelector('[data-xwe-tonal-analysis]').innerText),null,{timeout:5000});
 await p.getByRole('button',{name:'Invert Polarity'}).click();await done();assert.match(await out.innerText(),/edited during the analysis/);assert.notEqual(await revision(),rev0,'the invert edit itself went through');
 // ---- noise: no invented key ----
 await p.getByRole('button',{name:'Close ×'}).click();await p.waitForTimeout(800);await openEditor(noise);
 await btn.scrollIntoViewIfNeeded();await field('Start s',0);await field('End s',12);await btn.click();await done();t=await out.innerText();
 assert.match(t,/Tuning & scale: not determined/);assert.doesNotMatch(t,/^Root:/m,'no invented root');
 assert.deepEqual(errors,[]);console.log('PASS AUDIO-ANALYSE-01 Wave Editor: selection + 2:00 cap + <4 s + cancel + edit meanwhile + noise, read-only, nothing in the Forge rack');await b.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
