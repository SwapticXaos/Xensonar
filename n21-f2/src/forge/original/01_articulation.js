


/* F3.56. Pure offline PCM material module. Carrier events are immutable.
 * Whole recorded spectra, a fixed Carrier reference, and explicit source time.
 * No F0 classification, harmonic mask, per-state normalization, or oscillator.
 */

/* F3.56.42 independent ORIGINAL renderers — unchanged F3.56.40 code. */
function __f35636ArticulationFactoryOriginal() {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const median = a => { const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]??0; };
  function apply(carrier, model, sr, duration, cfg, material) {
    const amount=clamp(cfg.params.articulationAmount??1,0,1), sourceRate=model.sampleRate;
    for (const run of material.runs) {
      const band=carrier.bands[run.voice], count=run.endSample-run.startSample;
      const nodes=(model.atlas?.nodes??[]).filter(n=>n.center>=run.sourceStart+sourceRate*.028&&n.center<=run.sourceEnd-sourceRate*.028);
      const attacks=(model.atlas?.attacks??[]).filter(a=>a.start>=run.sourceStart&&a.end<=run.sourceEnd&&a.end>a.start);
      const gains=band.gainCurve.slice(run.firstCell,run.lastCell+1), peak=Math.max(...gains,1e-8);
      let rise=0; while(rise<gains.length-1&&gains[rise]<peak*.8)rise++;
      let fall=gains.length-1; while(fall>0&&gains[fall]<peak*.8)fall--;
      const cellSeconds=duration/Math.max(1,band.gainCurve.length-1), seconds=count/sr;
      // The carrier's edge supplies duration; no donor pre-roll can move the onset.
      const onsetFraction=clamp((rise*cellSeconds+.012)/Math.max(.001,seconds),.025,.32);
      const releaseFraction=clamp(((gains.length-1-fall)*cellSeconds+.018)/Math.max(.001,seconds),.025,.32);
      const span=run.sourceEnd-run.sourceStart, attack=attacks[0]??null;
      const from=attack?Math.max(run.sourceStart,attack.start-sourceRate*.002):run.sourceStart;
      const attackEnd=attack?Math.min(run.sourceEnd,attack.end):Math.min(run.sourceEnd,from+span*.12);
      const aper=median(nodes.map(n=>n.aperiodicity??.5)), rms=median(nodes.map(n=>n.rms??.05));
      let stable=null, best=Infinity;
      // Typical for THIS source, not a bias towards the cleanest or most periodic frame.
      for(let i=1;i<nodes.length-1;i++) {
        const n=nodes[i]; if(n.center<attackEnd||n.center>run.sourceEnd-span*.1)continue;
        const score=Math.abs((n.aperiodicity??aper)-aper)+.3*Math.abs(Math.log(((n.rms??rms)+1e-6)/(rms+1e-6)))+
          .5*Math.abs((nodes[i+1].aperiodicity??aper)-(nodes[i-1].aperiodicity??aper));
        if(score<best){best=score;stable=n;}
      }
      const sustainCenter=stable?.center??clamp(from+span*.52,attackEnd,run.sourceEnd);
      const available=Math.max(0,run.sourceEnd-sustainCenter), motion=clamp(cfg.params.gestaltMotion??.6,0,1);
      const extent=Math.min(available*.45,sourceRate*(.035+seconds*.09*motion));
      const sustainStart=Math.max(attackEnd,sustainCenter-extent*.5), sustainEnd=Math.min(run.sourceEnd,sustainCenter+extent*.5);
      const tail=nodes.filter(n=>n.center>=sustainEnd&&n.center>run.sourceEnd-span*.22);
      const release=tail.find(n=>(n.rms??Infinity)<rms*.85);
      const releaseStart=Math.max(sustainEnd,release?.center??run.sourceEnd-span*.09);
      const old=run.gestalt.sourceCurve, curve=new Float64Array(old.length);
      const bridge=Math.min(.035/Math.max(.001,seconds),.12), bodyEnd=1-releaseFraction;
      const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
      for(let i=0;i<curve.length;i++) {
        const t=i/Math.max(1,curve.length-1); let at;
        if(t<onsetFraction) at=lerp(from,attackEnd,t/onsetFraction);
        else if(t<onsetFraction+bridge) at=lerp(attackEnd,sustainStart,(t-onsetFraction)/bridge);
        else if(t<bodyEnd-bridge) at=lerp(sustainStart,sustainEnd,(t-onsetFraction-bridge)/Math.max(.001,bodyEnd-onsetFraction-2*bridge));
        else if(t<bodyEnd) at=lerp(sustainEnd,releaseStart,(t-bodyEnd+bridge)/bridge);
        else at=lerp(releaseStart,run.sourceEnd,(t-bodyEnd)/releaseFraction);
        // A dot uses a compact attack excerpt; no sustain is fabricated inside it.
        if(seconds<=.16)at=lerp(from,Math.min(run.sourceEnd,Math.max(attackEnd,from+sourceRate*seconds)),t);
        curve[i]=clamp(lerp(old[i],at,amount),run.sourceStart,run.sourceEnd);
      }
      run.gestalt.sourceCurve=curve;
      run.articulation={version:'carrier-articulation-f3.56.36',amount,onsetFraction,releaseFraction,
        attackObserved:!!attack,sustainObserved:!!stable,releaseObserved:!!release,
        sourceAttack:[from,attackEnd],sourceSustain:[sustainStart,sustainEnd],sourceRelease:[releaseStart,run.sourceEnd],
        role:seconds<=.16?'attack':'attack-sustain-release',carrierOnsetSample:run.startSample,carrierEndSample:run.endSample};
      run.workbenchRead.firstSourceCenter=curve[0];run.workbenchRead.lastSourceCenter=curve.at(-1);
    }
    material.articulation={version:'carrier-articulation-f3.56.36',amount,events:material.runs.length,
      authority:'carrier-time-pitch-gain-silence',source:'observed-donor-PCM',addedNoise:0,addedOscillators:0};
    return material;
  }
  return Object.freeze({apply});
}

const __F35636ArticulationOriginal=__f35636ArticulationFactoryOriginal();