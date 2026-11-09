import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const targetUrl = process.argv[2] || 'http://127.0.0.1:8773/index.html';
const outDir = process.argv[3] || '/mnt/data/xensonar_9104_escalating_browser_runs';
const candidateFilter = (process.env.XENSONAR_MATRIX_CANDIDATES || 'C1_balanced_shadow_default_candidate,C2_pressure_safe_shadow_browser_safe,C4_studio_density_shadow_musical_outlier,W1_balanced_worklet_granular_pilot').split(',').map(s => s.trim()).filter(Boolean);
const scenarioFilter = (process.env.XENSONAR_MATRIX_SCENARIOS || 'combo-root-particle-wave,full-lane-max-stress').split(',').map(s => s.trim()).filter(Boolean);
const measureScale = Number(process.env.XENSONAR_TARGETED_MATRIX_SCALE || 0.12);
const repetitions = Number(process.env.XENSONAR_TARGETED_MATRIX_REPETITIONS || 1);
const hardIntensity = Number(process.env.XENSONAR_TARGETED_INTENSITY || 1.35);
const port = Number(process.env.XENSONAR_CDP_PORT || (9900 + Math.floor(Math.random() * 250)));
mkdirSync(outDir, { recursive: true });

const candidates = [
  { id: 'C1_balanced_shadow_default_candidate', stylePreset: 'balanced', particlePreset: 'balanced', waveStarterPreset: 'balanced', rootFollowVoiceEngineMode: 'shadow-plan', rootFollowQuantizationMode: 'fallback', rootFollowQuantizationGrid: '32', particleCrisisMode: 'quantization-loosening', particleLoadReductionMode: 'soft-taper', particleAmbientMotionMode: 'gentle', particleQuantizationMode: 'fallback', particleQuantizationGrid: '64' },
  { id: 'C2_pressure_safe_shadow_browser_safe', stylePreset: 'pressure-safe-6879', particlePreset: 'pressure-safe-6879', waveStarterPreset: 'pressure-safe-6879', rootFollowVoiceEngineMode: 'shadow-plan', rootFollowQuantizationMode: 'fallback', rootFollowQuantizationGrid: '32', particleCrisisMode: 'quantization-pyramid', particleLoadReductionMode: 'adaptive-thin', particleAmbientMotionMode: 'gentle', particleQuantizationMode: 'fallback', particleQuantizationGrid: '32' },
  { id: 'C4_studio_density_shadow_musical_outlier', stylePreset: 'studio-density', particlePreset: 'studio-density', waveStarterPreset: 'studio-density', rootFollowVoiceEngineMode: 'shadow-plan', rootFollowQuantizationMode: 'off', rootFollowQuantizationGrid: '64', particleCrisisMode: 'quantization-liberation', particleLoadReductionMode: 'soft-taper', particleAmbientMotionMode: 'gentle', particleQuantizationMode: 'fallback', particleQuantizationGrid: '64' },
  { id: 'W1_balanced_worklet_granular_pilot', stylePreset: 'balanced', particlePreset: 'balanced', waveStarterPreset: 'balanced', rootFollowVoiceEngineMode: 'worklet-granular-pilot', rootFollowQuantizationMode: 'fallback', rootFollowQuantizationGrid: '32', particleCrisisMode: 'quantization-loosening', particleLoadReductionMode: 'soft-taper', particleAmbientMotionMode: 'gentle', particleQuantizationMode: 'fallback', particleQuantizationGrid: '64' },
].filter(c => candidateFilter.includes(c.id));

const scenarios = [
  { id: 'root-follow-glissando', warmupMs: 10000, measureMs: 60000, stimulusKind: 'root' },
  { id: 'particles-ringwaves', warmupMs: 10000, measureMs: 60000, stimulusKind: 'particles' },
  { id: 'wavestarter-firework', warmupMs: 8000, measureMs: 45000, stimulusKind: 'wave' },
  { id: 'combo-root-particle-wave', warmupMs: 12000, measureMs: 60000, stimulusKind: 'combo' },
  { id: 'full-lane-max-stress', warmupMs: 15000, measureMs: 60000, stimulusKind: 'full' },
].filter(s => scenarioFilter.includes(s.id));
if (!candidates.length || !scenarios.length) throw new Error('empty candidate/scenario selection');

function getJson(url) { return new Promise((resolve, reject) => http.get(url, res => { let d=''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }).on('error', reject)); }
async function waitFor(fn, ms = 30000, label = 'condition') { const started = Date.now(); let last; while (Date.now() - started < ms) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise(r => setTimeout(r, 250)); } throw last || new Error(`timeout waiting for ${label}`); }
class Cdp {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.pending = new Map(); this.consoleEvents = []; this.ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result ?? {}); } else { if (m.method === 'Runtime.consoleAPICalled') { const line = `[console.${m.params?.type}] ${(m.params?.args || []).map(a => a.value ?? a.description ?? a.type).join(' ')}`; this.consoleEvents.push(line); console.log(line.slice(0, 900)); } if (m.method === 'Runtime.exceptionThrown') { const line = `[runtime-exception] ${JSON.stringify(m.params).slice(0, 2000)}`; this.consoleEvents.push(line); console.error(line); } if (m.method === 'Log.entryAdded') { const e = m.params?.entry; const line = `[log.${e?.level}] ${e?.source}: ${e?.text}`; this.consoleEvents.push(line); console.log(line.slice(0, 900)); } } } }
  ready() { return new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; }); }
  send(method, params = {}, sessionId) { const id = this.id++; const payload = sessionId ? { id, method, params, sessionId } : { id, method, params }; this.ws.send(JSON.stringify(payload)); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
}
async function evalPage(cdp, sid, expression, timeout = 30000) { const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout }, sid); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 4000)); return r.result?.value; }
function csvEscape(value) { if (value == null) return ''; const s = String(value); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function rowFromPayload(runMeta, payload) { const stress = payload?.metadata?.audioTraffic?.stressComparison ?? payload?.entries?.at?.(-1)?.audioTraffic?.stressComparison ?? null; const audio = payload?.metadata?.audioTraffic ?? payload?.entries?.at?.(-1)?.audioTraffic ?? null; return { ...runMeta, burstRiskScore: stress?.burstRiskScore ?? null, robustnessScore: stress?.robustnessScore ?? null, musicalPreservationScore: stress?.musicalPreservationScore ?? null, restrictionCostScore: stress?.restrictionCostScore ?? null, rootFollowVoiceEngineMode: stress?.rootFollowVoiceEngineMode ?? runMeta.rootFollowVoiceEngineMode, workletPilotHealth: stress?.workletPilotHealth ?? stress?.workletStatus ?? null, primaryCandidateMuteEvents: stress?.primaryCandidateMuteEvents ?? null, browserOptimizedReadout: stress?.browserOptimizedReadout ?? null, dominantSubsystem: stress?.dominantSubsystem ?? null, maxEvents16: stress?.eventWindows?.['16']?.maxEvents ?? audio?.eventWindows?.['16']?.maxEvents ?? null, maxEvents50: stress?.eventWindows?.['50']?.maxEvents ?? audio?.eventWindows?.['50']?.maxEvents ?? null, maxEvents100: stress?.eventWindows?.['100']?.maxEvents ?? audio?.eventWindows?.['100']?.maxEvents ?? null, entryCount: Array.isArray(payload?.entries) ? payload.entries.length : null, harnessStimulusEvents: payload?.metadata?.harnessStimulus?.totalEvents ?? null, cdpMouseEvents: payload?.metadata?.harnessStimulus?.cdpMouseEvents ?? null, cdpKeyEvents: payload?.metadata?.harnessStimulus?.cdpKeyEvents ?? null, targetedActions: payload?.metadata?.harnessStimulus?.targetedActions?.join('|') ?? null, dummyRootFollowUploadOk: payload?.metadata?.prep?.dummyRootFollowUpload?.ok ?? null, dummyMaterialUploadOk: payload?.metadata?.prep?.dummyMaterialUpload?.ok ?? null, materialActive: payload?.metadata?.prep?.materialActive?.checkedAfter ?? null, rootFollowTitleAfterPrep: payload?.metadata?.prep?.rootFollowTitleAfterPrep ?? null, escalationHighestLevel: payload?.metadata?.harnessStimulus?.highestCompletedLevel ?? null, escalationFirstStallLevel: payload?.metadata?.harnessStimulus?.firstStallLevel ?? null, escalationRecovered: payload?.metadata?.harnessStimulus?.recoveredAfterCooldown ?? null, escalationLevels: Array.isArray(payload?.metadata?.harnessStimulus?.levels) ? payload.metadata.harnessStimulus.levels.map(l => `${l.id}:${l.status}:${l.totalEvents ?? 0}`).join('|') : null, burstUiRecorderOpened: payload?.metadata?.burstUi?.opened ?? null, burstUiDownloadButtonSeen: payload?.metadata?.burstUi?.downloadButtonSeen ?? null } }

const prepFunction = `(async function targetedPrep(){
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = { kind: 'xensonar-targeted-prep', startedAtIso: new Date().toISOString() };
  const allText = el => ((el.innerText || el.textContent || '') + ' ' + (el.title || '') + ' ' + (el.ariaLabel || '')).replace(/\\s+/g, ' ').trim();
  const clickButton = async (rx, label) => { const b = Array.from(document.querySelectorAll('button')).find(b => rx.test(allText(b))); if (!b) { out[label] = { ok:false, reason:'button-not-found' }; return null; } b.scrollIntoView({ block:'center', inline:'center' }); await sleep(50); b.click(); await sleep(650); out[label] = { ok:true, text: allText(b).slice(0,180) }; return b; };
  const ensureCheckboxByParent = async (rx, checked, label) => { const input = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(input => { let t=''; for(let n=input; n && t.length < 1500; n=n.parentElement) t += '\\n' + ((n.innerText||n.textContent||'').trim()); return rx.test(t); }); if (!input) { out[label] = { ok:false, reason:'checkbox-not-found' }; return false; } if (Boolean(input.checked) !== checked) { input.click(); await sleep(260); } out[label] = { ok:true, checkedAfter:Boolean(input.checked) }; return Boolean(input.checked); };
  const makeWavBlob = (seconds = 3.5, f1 = 82, f2 = 517) => { const sampleRate = 44100; const samples = Math.floor(sampleRate * seconds); const buffer = new ArrayBuffer(44 + samples * 2); const view = new DataView(buffer); const ws = (o,s)=>{ for(let i=0;i<s.length;i++) view.setUint8(o+i,s.charCodeAt(i)); }; ws(0,'RIFF'); view.setUint32(4,36+samples*2,true); ws(8,'WAVE'); ws(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); ws(36,'data'); view.setUint32(40,samples*2,true); for(let i=0;i<samples;i++){ const t=i/sampleRate; const env=Math.min(1,i/1000,(samples-i)/1000); const glide=f1 + (f2-f1)*(i/samples); const s=(Math.sin(2*Math.PI*glide*t)*0.35 + Math.sin(2*Math.PI*(f1*0.5)*t)*0.22 + Math.sin(2*Math.PI*(f2*1.5)*t)*0.08 + (((i*17)%101)/101-0.5)*0.04)*env; view.setInt16(44+i*2, Math.max(-1,Math.min(1,s))*0x7fff,true); } return new Blob([buffer], { type:'audio/wav' }); };
  const uploadToInput = async (input, filename, blob, label) => { const dt = new DataTransfer(); dt.items.add(new File([blob], filename, { type:'audio/wav' })); try { Object.defineProperty(input, 'files', { value: dt.files, configurable:true }); } catch { input.files = dt.files; } input.dispatchEvent(new Event('input', { bubbles:true })); input.dispatchEvent(new Event('change', { bubbles:true })); out[label] = { ok:true, filename, inputAccept: input.accept }; await sleep(1700); };
  await clickButton(/Power|OFFLINE|AKTIVIEREN/i, 'powerClick');
  await ensureCheckboxByParent(/Wellenstarter Lautstärke-Gradient X/i, true, 'waveVolumeGradient');
  await ensureCheckboxByParent(/Wellenstarter Obertöne aktiv/i, true, 'waveOvertones');
  await ensureCheckboxByParent(/Partikel Echo Aktiv/i, true, 'particleEcho');
  await ensureCheckboxByParent(/Spiralgerät aktiv/i, true, 'spiralDevice');
  await ensureCheckboxByParent(/Gerät aktiv.*Enter Hold|ENTER HOLD|PSY PULSE/i, true, 'enterHoldDevice');
  await ensureCheckboxByParent(/Schwarmdeuter aktiv/i, true, 'swarmReader');
  await ensureCheckboxByParent(/Live-Mastering aktiv/i, true, 'liveMastering');
  await clickButton(/Root Follow Loop verwalten|kein Root Follow|Root Follow/i, 'openRootFollowManager');
  const inputText = (el) => { let t=''; for(let n=el; n && t.length < 1800; n=n.parentElement) t += '\\n' + ((n.innerText || n.textContent || '').trim()); return t; };
  let inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const rootInput = inputs.find(input => input.accept === 'audio/*' && /Root-Follow-Loop Upload|ROOT FOLLOW STEUERUNG|Root Follow Loop Aktiv/i.test(inputText(input))) || inputs.find(input => input.accept === 'audio/*');
  if (rootInput) await uploadToInput(rootInput, 'xensonar-targeted-root-follow-dummy.wav', makeWavBlob(3.5, 74, 620), 'dummyRootFollowUpload'); else out.dummyRootFollowUpload = { ok:false, reason:'root-audio-input-not-found', inputCount: inputs.length };
  await ensureCheckboxByParent(/Root Follow Loop Aktiv/i, true, 'rootFollowActive');
  await clickButton(/Hotkeys Root Follow/i, 'hotkeysRootFollow');
  out.rootFollowTitleAfterPrep = Array.from(document.querySelectorAll('button')).find(b => /Root Follow Loop verwalten|Root Follow/i.test(allText(b)))?.title || '';
  await clickButton(/Materialspur verwalten|keine Mat/i, 'openMaterialManager');
  inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const materialInput = inputs.find(input => input.accept === 'audio/*' && /MATERIALSPUR STEUERUNG|Loop Upload|Materialspur Aktiv/i.test(inputText(input)));
  if (materialInput) await uploadToInput(materialInput, 'xensonar-targeted-material-dummy.wav', makeWavBlob(4.0, 55, 330), 'dummyMaterialUpload'); else out.dummyMaterialUpload = { ok:false, reason:'material-audio-input-not-found', inputCount: inputs.length };
  await ensureCheckboxByParent(/Materialspur Aktiv/i, true, 'materialActive');
  await clickButton(/Drum Pattern verwalten|Broken Lilt|🥁/i, 'openDrumManager');
  await ensureCheckboxByParent(/Drums Aktiv/i, true, 'drumsActive');
  await clickButton(/Bass Pattern verwalten|RhythmForge|🎸/i, 'openBassManager');
  await ensureCheckboxByParent(/Bass Aktiv/i, true, 'bassActive');
  for (const b of Array.from(document.querySelectorAll('button')).filter(b => /^×$/.test((b.innerText||b.textContent||'').trim())).slice(0,8)) { b.click(); await sleep(120); }
  window.scrollTo(0, 0); await sleep(500);
  out.completedAtIso = new Date().toISOString();
  out.finalStatusTitles = Array.from(document.querySelectorAll('button')).map(b => b.title || '').filter(Boolean).filter(t => /Root Follow|Materialspur|Drum Pattern|Bass Pattern/.test(t));
  return out;
})`;

const scenarioSetupFunction = `(async function setupScenario(scenarioId){
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = { scenarioId, actions: [] };
  const allText = el => ((el.innerText || el.textContent || '') + ' ' + (el.title || '') + ' ' + (el.ariaLabel || '')).replace(/\\s+/g, ' ').trim();
  const clickButton = async (rx, label) => { const b = Array.from(document.querySelectorAll('button')).find(b => rx.test(allText(b))); if (!b) { out.actions.push(label + ':missing'); return false; } b.scrollIntoView({ block:'center', inline:'center' }); await sleep(30); b.click(); await sleep(240); out.actions.push(label); return true; };
  const ensureCheckboxByParent = async (rx, checked, label) => { const input = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(input => { let t=''; for(let n=input; n && t.length < 1500; n=n.parentElement) t += '\\n' + ((n.innerText||n.textContent||'').trim()); return rx.test(t); }); if (!input) { out.actions.push(label+':missing'); return false; } if (Boolean(input.checked) !== checked) { input.click(); await sleep(160); } out.actions.push(label+':'+Boolean(input.checked)); return Boolean(input.checked); };
  if (/particles|combo|full/.test(scenarioId)) { await clickButton(/Partikel-Hotkeys/i, 'partikel-hotkeys'); await ensureCheckboxByParent(/Partikel Echo Aktiv/i, true, 'particle-echo'); }
  if (/root|combo|full/.test(scenarioId)) { await clickButton(/Hotkeys Root Follow/i, 'root-hotkeys'); await ensureCheckboxByParent(/Root Follow Loop Aktiv/i, true, 'root-follow-active'); }
  if (/wave|combo|full/.test(scenarioId)) { await ensureCheckboxByParent(/Wellenstarter Obertöne aktiv/i, true, 'wave-overtones'); await ensureCheckboxByParent(/Wellenstarter Lautstärke-Gradient X/i, true, 'wave-volume-gradient'); }
  if (/full/.test(scenarioId)) { await ensureCheckboxByParent(/Materialspur Aktiv/i, true, 'material-active'); await ensureCheckboxByParent(/Drums Aktiv/i, true, 'drums-active'); await ensureCheckboxByParent(/Bass Aktiv/i, true, 'bass-active'); }
  for (const b of Array.from(document.querySelectorAll('button')).filter(b => /^×$/.test((b.innerText||b.textContent||'').trim())).slice(0,8)) { b.click(); await sleep(80); }
  window.scrollTo(0,0); await sleep(240);
  return out;
})`;

async function getCanvasRect(cdp, sid) {
  return await evalPage(cdp, sid, `(() => { const c = document.querySelector('canvas'); const r = (c || document.body).getBoundingClientRect(); return { left:r.left, top:r.top, width:r.width, height:r.height, dpr:window.devicePixelRatio || 1, scrollY: window.scrollY }; })()`, 10000);
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function pressKey(cdp, sid, key, code = key, text = '') { await cdp.send('Input.dispatchKeyEvent', { type:'keyDown', key, code, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined, text }, sid); await cdp.send('Input.dispatchKeyEvent', { type:'keyUp', key, code, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined }, sid); }

async function holdKeyDown(cdp, sid, key, code = key) {
  await cdp.send('Input.dispatchKeyEvent', { type:'keyDown', key, code, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined }, sid);
}
async function holdKeyUp(cdp, sid, key, code = key) {
  await cdp.send('Input.dispatchKeyEvent', { type:'keyUp', key, code, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined }, sid);
}
async function uiBurstRecorderProbe(cdp, sid, action = 'open') {
  return await evalPage(cdp, sid, `(async()=>{
    const sleep = ms => new Promise(r=>setTimeout(r, ms));
    const text = el => ((el.innerText||el.textContent||'') + ' ' + (el.title||'') + ' ' + (el.ariaLabel||'')).replace(/\\s+/g,' ').trim();
    const buttons = () => Array.from(document.querySelectorAll('button'));
    const clickRx = async (rx) => { const b = buttons().find(b => rx.test(text(b))); if (!b) return { ok:false }; b.scrollIntoView({block:'center', inline:'center'}); await sleep(40); b.click(); await sleep(450); return { ok:true, text:text(b).slice(0,160) }; };
    const out = { action:${JSON.stringify(action)}, opened:false, started:false, stopped:false, downloadButtonSeen:false, at:new Date().toISOString() };
    const open = await clickRx(/Burst-Diagnose anzeigen|BURST-DIAGNOSE ANZEIGEN|Burst-Diagnose/i);
    out.opened = open.ok;
    if (${JSON.stringify(action)} === 'start') {
      const s = await clickRx(/Aufzeichnung starten/i); out.started = s.ok;
    }
    if (${JSON.stringify(action)} === 'stop') {
      const st = await clickRx(/Aufzeichnung stoppen/i); out.stopped = st.ok;
      await sleep(250);
      out.downloadButtonSeen = buttons().some(b => /Log herunterladen/i.test(text(b)) && !b.disabled);
    }
    return out;
  })()`, 15000).catch(error => ({ error:String(error), action }));
}
async function escalatingStimulus(cdp, sid, scenario, measureMs, intensity) {
  const rect = await getCanvasRect(cdp, sid);
  const w = Math.max(320, rect.width || 1100); const h = Math.max(240, rect.height || 580); const left = rect.left; const top = rect.top;
  const phaseScale = Number(process.env.XENSONAR_ESCALATION_PHASE_SCALE || 1);
  const safe = (promise, timeoutMs = 450) => Promise.race([promise.catch((error) => ({ __safeError: String(error).slice(0,180) })), new Promise(resolve => setTimeout(() => resolve({ __timeout:true }), timeoutMs))]);
  const rootKeys = ['a','s','d','f','g','h','j','k','l',';'];
  const glissKeys = ['a','s','d','f','g','h','j','k','l',';','l','k','j','h','g','f','d','s','a'];
  const clusterKeys = ['a','d','g','j',';','s','f','h','k','l','o','p'];
  const waveKeys = ['Enter',' ','Enter','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','y','x','c','v'];
  const particleKeys = ['q','w','e','r','t','z','u','i','o','p','m','n'];
  const levels = [
    { id:'L0-warmup-active-lanes', durationMs:900, loops:10, keyEvery:7, wheelEvery:0, hold:false, clickEvery:5, kind:'warmup' },
    { id:'L1-root-follow-keyboard-glissando', durationMs:1300, loops:22, keyEvery:1, wheelEvery:0, hold:false, clickEvery:4, kind:'root-gliss' },
    { id:'L2-apostroph-hold-long-tones', durationMs:1500, loops:30, keyEvery:1, wheelEvery:7, hold:true, clickEvery:3, kind:'apostroph-hold' },
    { id:'L3-wavestarter-dauerfeuer', durationMs:1700, loops:38, keyEvery:1, wheelEvery:6, hold:false, clickEvery:2, kind:'wave-dauerfeuer' },
    { id:'L4-particle-ringwave-resident-reaction', durationMs:1900, loops:48, keyEvery:1, wheelEvery:5, hold:false, clickEvery:2, kind:'ringwaves-residents' },
    { id:'L5-combo-all-lanes-pressure', durationMs:2200, loops:62, keyEvery:1, wheelEvery:4, hold:true, clickEvery:2, kind:'combo-all' },
    { id:'L6-dauerfeuer-no-mercy', durationMs:2600, loops:86, keyEvery:1, wheelEvery:3, hold:true, clickEvery:1, kind:'dauerfeuer' },
  ].map(level => ({ ...level, durationMs: Math.max(400, Math.round(level.durationMs * phaseScale)), loops: Math.max(4, Math.round(level.loops * intensity)) }));
  const result = { kind:'escalating-full-pressure-cdp-stimulus', scenarioId:scenario.id, stimulusKind:scenario.stimulusKind, phaseScale, intensity, startedAtIso:new Date().toISOString(), levels:[], highestCompletedLevel:null, firstStallLevel:null, recoveredAfterCooldown:null, totalEvents:0, cdpMouseEvents:0, cdpKeyEvents:0, cdpWheelEvents:0, targetedActions:['active-lanes','root-follow-dummy','material-dummy','burst-recorder','apostroph-hold','keyboard-glissando','mouse-dauerfeuer','resident-ringwave-reaction'] };
  await safe(cdp.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:left + w*0.5, y:top + h*0.5 }, sid)); result.cdpMouseEvents++;
  for (let li=0; li<levels.length; li++) {
    const level = levels[li];
    const levelStarted = Date.now();
    const lr = { id:level.id, startedAtIso:new Date().toISOString(), durationTargetMs:level.durationMs, loopsTarget:level.loops, status:'running', totalEvents:0, mouseEvents:0, keyEvents:0, wheelEvents:0, timeouts:0, safeErrors:0 };
    try {
      if (level.hold) { const r = await safe(holdKeyDown(cdp, sid, "'", 'Quote'), 700); if (r?.__timeout) lr.timeouts++; else lr.keyEvents++; }
      const end = Date.now() + level.durationMs;
      let n = 0;
      while (Date.now() < end && n < level.loops) {
        const t = Date.now() - levelStarted;
        const swirl = level.kind === 'dauerfeuer' ? 0.091 : level.kind === 'ringwaves-residents' ? 0.071 : 0.049;
        const fx = 0.5 + 0.49 * Math.sin(t * swirl + n * 0.73 + li);
        const fy = 0.5 + 0.46 * Math.cos(t * (swirl * 1.31) + n * 0.91 + li * 0.4);
        const jump = n % 9 === 0;
        const x = Math.round(left + 8 + (jump ? ((n * 137) % Math.max(1, w-16)) : fx * (w - 16)));
        const y = Math.round(top + 8 + (jump ? ((n * 211) % Math.max(1, h-16)) : fy * (h - 16)));
        const mv = await safe(cdp.send('Input.dispatchMouseEvent', { type:'mouseMoved', x, y, buttons: (level.clickEvery <= 2 ? 1 : 0) }, sid), 360); lr.mouseEvents++; if (mv?.__timeout) lr.timeouts++; if (mv?.__safeError) lr.safeErrors++;
        if (level.clickEvery && n % level.clickEvery === 0) {
          const pr = await safe(cdp.send('Input.dispatchMouseEvent', { type:'mousePressed', x, y, button:'left', buttons:1, clickCount:1 }, sid), 360); const rr = await safe(cdp.send('Input.dispatchMouseEvent', { type:'mouseReleased', x, y, button:'left', buttons:0, clickCount:1 }, sid), 360); lr.mouseEvents += 2; if (pr?.__timeout || rr?.__timeout) lr.timeouts++; if (pr?.__safeError || rr?.__safeError) lr.safeErrors++;
        }
        if (level.keyEvery && n % level.keyEvery === 0) {
          const bank = level.kind.includes('wave') ? waveKeys : level.kind.includes('ring') ? particleKeys.concat(waveKeys) : level.kind.includes('combo') || level.kind.includes('dauer') ? glissKeys.concat(clusterKeys, waveKeys, particleKeys) : glissKeys;
          const key = bank[(n + li * 3) % bank.length];
          const code = key === ' ' ? 'Space' : key === "'" ? 'Quote' : key;
          const kr = await safe(pressKey(cdp, sid, key, code, key.length === 1 ? key : ''), 650); lr.keyEvents += 2; if (kr?.__timeout) lr.timeouts++; if (kr?.__safeError) lr.safeErrors++;
        }
        if (level.wheelEvery && n % level.wheelEvery === 0) { const wr = await safe(cdp.send('Input.dispatchMouseEvent', { type:'mouseWheel', x, y, deltaX: ((n % 5)-2)*95, deltaY: ((n % 7)-3)*85 }, sid), 360); lr.wheelEvents++; if (wr?.__timeout) lr.timeouts++; if (wr?.__safeError) lr.safeErrors++; }
        n++;
        if (level.kind === 'dauerfeuer') { /* no deliberate relief */ } else if (n % 12 === 0) await sleep(1);
        if (lr.timeouts >= 10) { lr.status = 'stall-suspected'; result.firstStallLevel ||= level.id; break; }
      }
    } catch (error) {
      lr.status = 'error'; lr.error = String(error).slice(0,500); result.firstStallLevel ||= level.id;
    } finally {
      if (level.hold) { try { await holdKeyUp(cdp, sid, "'", 'Quote'); lr.keyEvents++; } catch {} }
    }
    lr.elapsedMs = Date.now() - levelStarted;
    lr.totalEvents = lr.mouseEvents + lr.keyEvents + lr.wheelEvents;
    if (lr.status === 'running') lr.status = 'completed';
    result.levels.push(lr);
    result.totalEvents += lr.totalEvents; result.cdpMouseEvents += lr.mouseEvents; result.cdpKeyEvents += lr.keyEvents; result.cdpWheelEvents += lr.wheelEvents;
    if (lr.status === 'completed') result.highestCompletedLevel = level.id;
    const alive = await evalPage(cdp, sid, `Boolean(window.__xensonarBurstStressHarness && document.readyState === 'complete')`, 2500).catch(() => false);
    if (!alive) { lr.status = lr.status === 'completed' ? 'renderer-unresponsive-after-level' : lr.status; result.firstStallLevel ||= level.id; break; }
    if (lr.status !== 'completed') break;
    await sleep(level.kind === 'dauerfeuer' ? 150 : 60);
  }
  await sleep(750);
  result.recoveredAfterCooldown = await evalPage(cdp, sid, `Boolean(window.__xensonarBurstStressHarness && window.__xensonarPerformanceCrisisHarness)`, 3000).catch(() => false);
  result.completedAtIso = new Date().toISOString();
  return result;
}
const profile = `/tmp/xen-escalating-profile-${Date.now()}`;
const chrome = spawn('/usr/bin/chromium', [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run','--no-default-browser-check','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion','--no-proxy-server','--proxy-server=direct://','--proxy-bypass-list=*','--window-size=1600,1200','--headless=new','about:blank'], { stdio:['ignore','pipe','pipe'] });
chrome.stderr.on('data', d => { const t = d.toString(); if (/DevTools|FATAL|ERROR/.test(t)) console.error('[chromium]', t.slice(0,700)); });

const allRows=[]; const allPayloads=[]; const startedAtIso = new Date().toISOString();
const runLabel = `targeted_${candidateFilter.join('_')}_${scenarioFilter.join('_')}`.replace(/[^A-Za-z0-9._-]+/g,'_').slice(0, 150);
const jsonlPath = resolve(outDir, `xensonar_9.103_${runLabel}_${startedAtIso.replace(/[:.]/g,'-')}.jsonl`);
let prep = null;
try {
  const version = await waitFor(() => getJson(`http://127.0.0.1:${port}/json/version`), 20000, 'CDP version');
  const cdp = new Cdp(version.webSocketDebuggerUrl); await cdp.ready();
  const target = await cdp.send('Target.createTarget', { url:'about:blank' });
  const attach = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten:true });
  const sid = attach.sessionId;
  await cdp.send('Runtime.enable', {}, sid); await cdp.send('Log.enable', {}, sid); await cdp.send('Page.enable', {}, sid);
  await cdp.send('Page.navigate', { url: targetUrl }, sid);
  await waitFor(async () => (await cdp.send('Runtime.evaluate', { expression:'document.readyState', returnByValue:true }, sid)).result?.value === 'complete', 30000, 'document complete');
  await waitFor(async () => (await cdp.send('Runtime.evaluate', { expression:'Boolean(window.__xensonarPerformanceCrisisHarness && window.__xensonarBurstStressHarness)', returnByValue:true }, sid)).result?.value, 30000, 'harness ready');
  console.log('[escalating] harness ready', { targetUrl, measureScale, repetitions, hardIntensity, candidates: candidates.map(c=>c.id), scenarios: scenarios.map(s=>s.id) });
  prep = await evalPage(cdp, sid, `(${prepFunction})()`, 90000);
  console.log('[escalating] prep', prep);
  let runIndex=0;
  for (const candidate of candidates) for (const scenario of scenarios) for (let repetitionIndex=1; repetitionIndex<=repetitions; repetitionIndex++) {
    runIndex++;
    const runId = `9.104_escalating_${candidate.id}_${scenario.id}_r${repetitionIndex}_${runIndex}`.replace(/[^A-Za-z0-9._-]+/g,'_');
    const warmupMs = Math.max(1000, Math.round(scenario.warmupMs * measureScale));
    const measureMs = Math.max(2200, Math.round(scenario.measureMs * measureScale));
    console.log('[escalating] run-start', { runId, warmupMs, measureMs });
    const setup = await evalPage(cdp, sid, `(${scenarioSetupFunction})(${JSON.stringify(scenario.id)})`, 30000).catch(e => ({ error:String(e) }));
    await evalPage(cdp, sid, `window.__xensonarPerformanceCrisisHarness.applyCandidate(${JSON.stringify(candidate)}); true`, 15000);
    await sleep(1200);
    await evalPage(cdp, sid, `window.__xensonarBurstStressHarness.setScenario(${JSON.stringify(scenario.id)}); true`, 15000);
    await sleep(800);
    const activeScenario = await evalPage(cdp, sid, `window.__xensonarBurstStressHarness.getScenario ? window.__xensonarBurstStressHarness.getScenario() : null`, 10000);
    const burstUiStart = await uiBurstRecorderProbe(cdp, sid, 'start');
    await evalPage(cdp, sid, `window.__xensonarBurstStressHarness.clear(); window.__xensonarBurstStressHarness.start(); true`, 10000);
    await sleep(warmupMs);
    const stimulus = await escalatingStimulus(cdp, sid, scenario, measureMs, hardIntensity);
    await evalPage(cdp, sid, `window.__xensonarBurstStressHarness.stop(); true`, 10000);
    const burstUiStop = await uiBurstRecorderProbe(cdp, sid, 'stop');
    await sleep(350);
    const payloadJson = await evalPage(cdp, sid, `JSON.stringify(window.__xensonarBurstStressHarness.exportPayload(${JSON.stringify({ version:'3.2.91.6.9.104', runId, candidateId:candidate.id, candidateConfig:candidate, scenarioId:scenario.id, repetitionIndex, cdpTargetedRunner:true, measureScale, hardIntensity, warmupMs, measureMs, prep, scenarioSetup:null, activeScenarioAfterSet: activeScenario, harnessStimulus: stimulus, burstUi: { opened: Boolean(burstUiStart?.opened || burstUiStop?.opened), started: Boolean(burstUiStart?.started), stopped: Boolean(burstUiStop?.stopped), downloadButtonSeen: Boolean(burstUiStop?.downloadButtonSeen), startProbe: burstUiStart, stopProbe: burstUiStop }, startedAtIso, completedAtIso:new Date().toISOString() })}))`, 20000);
    const payload = JSON.parse(payloadJson);
    payload.metadata.scenarioSetup = setup;
    const row = rowFromPayload({ runId, candidateId:candidate.id, scenarioId:scenario.id, repetitionIndex, rootFollowVoiceEngineMode:candidate.rootFollowVoiceEngineMode, warmupMs, measureMs, measureScale, hardIntensity }, payload);
    allRows.push(row); allPayloads.push({ runId, candidateId:candidate.id, scenarioId:scenario.id, repetitionIndex, payload });
    appendFileSync(jsonlPath, JSON.stringify({ row, payload }) + '\n');
    console.log('[escalating] run-done', row);
    await sleep(850);
  }
  const result = { kind:'xensonar-cdp-escalating-full-pressure-matrix', version:'3.2.91.6.9.104', generatedAtIso:new Date().toISOString(), targetUrl, measureScale, hardIntensity, repetitions, prep, candidates:candidates.map(c=>c.id), scenarios:scenarios.map(s=>s.id), rows:allRows, payloads:allPayloads };
  const outJson = resolve(outDir, `xensonar_9.103_${runLabel}_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  writeFileSync(outJson, JSON.stringify(result, null, 2) + '\n');
  const csvHeader = Object.keys(allRows[0] || { runId:'', candidateId:'', scenarioId:'' });
  writeFileSync(outJson.replace(/\.json$/, '.csv'), csvHeader.join(',') + '\n' + allRows.map(r => csvHeader.map(k => csvEscape(r[k])).join(',')).join('\n') + '\n');
  const md = ['# Xensonar 9.104 Escalating Full-Pressure CDP Matrix', '', `Target: ${targetUrl}`, `Scale: ${measureScale}`, `Hard intensity: ${hardIntensity}`, `Runs: ${allRows.length}`, '', '| Candidate | Scenario | Risk | Robust | Preserve | Restrict | Dom | 16ms | Events | Highest | Stall | Recovered | Engine |', '|---|---|---:|---:|---:|---:|---|---:|---:|---|---|---|---|', ...allRows.map(r => `| ${r.candidateId} | ${r.scenarioId} | ${r.burstRiskScore ?? ''} | ${r.robustnessScore ?? ''} | ${r.musicalPreservationScore ?? ''} | ${r.restrictionCostScore ?? ''} | ${r.dominantSubsystem ?? ''} | ${r.maxEvents16 ?? ''} | ${r.harnessStimulusEvents ?? ''} | ${r.escalationHighestLevel ?? ''} | ${r.escalationFirstStallLevel ?? ''} | ${r.escalationRecovered ?? ''} | ${r.rootFollowVoiceEngineMode ?? ''} |`)].join('\n') + '\n';
  writeFileSync(outJson.replace(/\.json$/, '.md'), md);
  writeFileSync(outJson.replace(/\.json$/, '_console.log'), cdp.consoleEvents.join('\n') + '\n');
  console.log('[escalating] wrote', outJson);
  await cdp.send('Browser.close').catch(() => null);
} finally { try { chrome.kill('SIGTERM'); } catch {} }
