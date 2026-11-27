'use strict';
// LOOPREC-RETRY-01 (real app): XenSonar open in a second tab writes the shared working session; Loop-Rec in the first tab failed
// ("Working session changed in another tab") and "Rec failed · retry" never worked until a reload.
// Now: (1) a failed start → one retry click takes the working session over and records; (2) a take that failed while saving
// is recovered by the retry click (no new recording); (3) a Session Take the other tab added is kept when this tab takes over.
// Usage: node tests/e2e/looprec_retry_other_tab.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const bc=await b.newContext({viewport:{width:1440,height:1000}});
 const p=await bc.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const q=await bc.newPage();await q.goto('file://'+html);await q.waitForTimeout(4000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const st=async()=>JSON.parse(await E(`JSON.stringify(__XenLoopRec.snapshot())`));
 const click=()=>p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^(Loop-Rec|Rec failed|Enough)/.test(x.getAttribute('aria-label')||''));b.click();return b.getAttribute('aria-label')});
 // the other tab writes the working session (as it does on any change), here with one Session Take of its own
 const otherTabWrites=extraTake=>q.evaluate(t=>{const k='xensonar.working-session.v1';const o=JSON.parse(localStorage.getItem(k));o.row.name=(o.row.name||'')+' ';
  if(t){o.row.sessionTakes=[...(o.row.sessionTakes||[]),t]}localStorage.setItem(k,JSON.stringify(o))},extraTake||null);
 const waitPhase=async(re,ms=8000)=>{const t0=Date.now();for(;;){const s=await st();if(re.test(s.phase))return s;if(Date.now()-t0>ms)return s;await p.waitForTimeout(150)}};
 // (1) failed start → retry records
 await otherTabWrites();
 await click();let s=await waitPhase(/failed|recording/);assert.equal(s.phase,'failed','start fails while the other tab owns the working session');
 assert.match(s.message,/another tab/);assert.match(await p.evaluate(()=>document.querySelector('[data-xen-loop-rec]')?.title||''),/another tab/,'the reason is shown on the button');
 assert.equal(await click(),'Rec failed · retry');s=await waitPhase(/recording/);assert.equal(s.phase,'recording','retry takes the working session over and records');
 await p.waitForTimeout(2600);await click();s=await waitPhase(/idle|failed/,12000);assert.equal(s.phase,'idle',JSON.stringify(s));assert.match(s.message,/saved/);
 // (2) the other tab writes DURING a take (with a take of its own) → saving fails → retry recovers the retained take
 await click();await waitPhase(/recording/);await p.waitForTimeout(2600);
 const otherTake={id:'loop-rec-other-tab-1',name:'Loop 42'};
 const sessionId=await E(`__XenMetaSessions.snapshot().activePalette?.id??null`);
 await otherTabWrites({...otherTake});
 await click();s=await waitPhase(/idle|failed/,12000);assert.equal(s.phase,'failed','saving fails while the other tab owns it: '+JSON.stringify(s));
 const before=await E(`bs().entries.filter(e=>e.sessionTake).length`);
 await click();s=await waitPhase(/idle|failed/,12000);
 assert.equal(s.phase,'idle','retry recovers: '+JSON.stringify(s));assert.match(s.message,/Recovered 1/,'the retained take is recovered, no new recording');
 assert.equal(await E(`bs().entries.filter(e=>e.sessionTake).length`),before,'no extra take recorded');
 // (3) the other tab's take is still in the working session
 const takes=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.working-session.v1')).row.sessionTakes.map(t=>t.id));
 assert.ok(takes.includes(otherTake.id),'the other tab\'s Session Take is kept: '+JSON.stringify(takes)+' session '+sessionId);
 assert.deepEqual(errors,[]);console.log('PASS LOOPREC-RETRY-01 retry takes over from another tab, recovers a retained take, keeps the other tab\'s takes');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
