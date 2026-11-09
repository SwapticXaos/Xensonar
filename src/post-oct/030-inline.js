
/* LCR-1B-COLLECTOR-BEGIN */
// Explicit opt-in, bounded, control-thread-only collection of existing LCR-1A
// snapshots. No AudioNodes, WebAudio edges, worklets or capture permissions.
(function(){
 'use strict';
 if(typeof window==='undefined'||window.__XenLCR1B)return;
 const intervalMs=2000, capacity=12000;
 let enabled=false, timer=null, lastSeq=0, missing=0, overflow=0;
 let records=[],marks=[], samplesSeen=0,startedAt=null,stoppedAt=null;
 const now=()=>({unixMs:Date.now(),perfNowMs:performance.now(),timeOriginMs:performance.timeOrigin||null});
 function harvest(){
  if(!enabled)return;
  const snapshot=window.__XenLCR1A?.snapshot?.();
  if(!snapshot?.enabled||!Array.isArray(snapshot.samples)){
   marks.push({kind:'TELEMETRY_UNAVAILABLE',clock:now()});return;
  }
  const fresh=snapshot.samples.filter(s=>Number.isFinite(s?.seq)&&s.seq>lastSeq);
  if(fresh.length){
   if(lastSeq&&fresh[0].seq>lastSeq+1){
    const gap=fresh[0].seq-lastSeq-1;missing+=gap;
    marks.push({kind:'TELEMETRY_SAMPLES_MISSING',count:gap,clock:now()});
   }
   lastSeq=fresh[fresh.length-1].seq;
   for(const x of fresh)records.push(x);
   samplesSeen+=fresh.length;
   if(records.length>capacity){const lost=records.length-capacity;records.splice(0,lost);overflow+=lost;}
  }
 }
 function start(){
  if(enabled)return true;
  if(!window.__XenLCR1A?.enable)throw new Error('LCR-1A master boundary diagnostic missing');
  // No automatic start at page load; this is a user-initiated experiment.
  window.__XenLCR1A.enable();
  enabled=true;startedAt=now();stoppedAt=null;
  marks.push({kind:'START',clock:startedAt});
  harvest();timer=setInterval(harvest,intervalMs);return true;
 }
 function stop(){
  if(!enabled)return true;
  harvest();enabled=false;clearInterval(timer);timer=null;
  stoppedAt=now();marks.push({kind:'STOP',clock:stoppedAt});
  // Intentionally do not disable LCR-1A; recorder's explicit opt-in is separate.
  return true;
 }
 function mark(label){
  if(!enabled)throw new Error('Collector not active');
  if(typeof label!=='string'||!label.trim()||label.length>120)throw new TypeError('Use a nonempty short label');
  harvest();const item={kind:'USER_MARK',label,clock:now(),lastBrowserSeq:lastSeq};
  marks.push(item);return item;
 }
 function status(){return {enabled,samplesSeen,retained:records.length,missing,overflow,lastSeq,marks:marks.length,intervalMs,capacity,startedAt,stoppedAt};}
 function snapshot(){harvest();return {schema:'xensonar-lcr1b-browser-collector-v1',source:'LCR1A browser internal taps only',hardwareOutputObserved:false,
   clockWarning:'performance timeOrigin+performance.now approximates epoch; no sample-accurate OS/capture synchronization without a verified common landmark',
   status:status(),marks:marks.slice(),samples:records.slice()};}
 function exportJSON(){
  const data=JSON.stringify(snapshot());
  const blob=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='xensonar_lcr1b_browser_'+Date.now()+'.json';
  a.style.display='none';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  return {bytes:data.length,filename:a.download};
 }
 function reset(){if(enabled)throw new Error('Stop before resetting');records=[];marks=[];lastSeq=0;missing=0;overflow=0;samplesSeen=0;startedAt=null;stoppedAt=null;return true;}
 window.__XenLCR1B=Object.freeze({start,stop,mark,status,snapshot,exportJSON,reset});
})();
/* LCR-1B-COLLECTOR-END */

