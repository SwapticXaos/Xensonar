// Pinned M2 direct encoder reference; original function, no DSP replacement.
function __wave39PlayTone(e, shape, intended) {
  if(!__wave39Owned(e.ctx))return null;
  const ctx=e.ctx,gradient=!shape.useScheduledTonePath,sr=ctx.sampleRate;
  // Keep the same bounded 20ms input deadline as VW. An ordinary direct
  // keyboard event is already a few milliseconds old when it reaches C11;
  // requiring its ORIGINAL timestamp to be >= currentTime drops valid notes.
  // Start is still clamped to currentTime + K3 below: no queue or late replay.
  if(!Jp(ctx,intended,.02))return false;
  const type={sine:0,triangle:1,sawtooth:2,square:3}[e.waveform];
  if(type===undefined)return false;
  const start=Math.max(intended,ctx.currentTime+K3);
  const reservation=__wave39Reserve(ctx,start,gradient?24:4);
  if(!reservation)return false;
  let ticket,released=false;
  const release=()=>{if(!released){released=true;e.transientRuntime.releaseVoice(ticket)}};
  try {
    ticket=e.wavePlan?e.transientRuntime.admitVoice(e.wavePlan,e.prominence):null;
    if(e.wavePlan&&!ticket){reservation.host.cancelUnsubmitted(reservation.token);return false;}
    const gainScale=ticket?.plan.gainScale??1,softening=ticket?.plan.envelopeScale??1;
    const targets=ticket?(e.waveTargetPrefixes&&e.transientRuntime.pickPreparedTargets?e.transientRuntime.pickPreparedTargets(e.waveTargetPrefixes,ticket):e.transientRuntime.pickTargets(e.waveTargets,ticket)):e.waveTargets;
    const mask=reservation.host.resolveAuxRouteMask(targets??[]);
    if(mask<0){reservation.host.cancelUnsubmitted(reservation.token);release();return false;}
    const host=reservation.host;
    if(e.mainOutput&&host.waveMainDestination!==e.mainOutput){
      if(host.waveMainDestination)try{host.node.disconnect(host.waveMainDestination,8,0)}catch{}
      host.node.connect(e.mainOutput,8,0);host.waveMainDestination=e.mainOutput;
    }
    const encoder=reservation.route.waveEncoder;
    if(gradient){
      const g=e.waveGradient,p=lAe({waveGradient:g,toneFreq:e.toneFreq,now:start,gradientDuration:shape.gradientDuration,shapedVolume:shape.shapedVolume,activeCount:e.activeScheduledTonesRef.current.length,heldLong:e.heldLong,gainScale,overloadSoftening:softening,attackSoftening:e.attackSoftening??1});
      encoder.begin(reservation,1,type,e.heldLong,Math.ceil((p.stopAt-start)*sr),mask|128)
        .set(8,e.toneFreq).set(9,shape.shapedCutoff).set(10,Math.max(280,shape.shapedCutoff*(.88+g.shine*.05))).set(11,shape.shapedResonance)
        .set(12,p.coreLevel).set(13,g.dryLateMul).set(14,p.actualDur*sr).set(15,(p.corePeakAt-start)*sr).set(16,(p.dryDuckAt-start)*sr)
        .set(17,p.colorLevel).set(18,p.colorDelay*sr).set(19,(p.colorPeakAt-start)*sr).set(20,g.exciterPreGain).set(21,g.exciterDrive).set(22,g.jawariDrive)
        .set(23,g.jawariQ).set(24,g.jawariGain).set(25,g.vowel1Q).set(27,g.vowel1Gain).set(28,g.vowel2Q).set(29,g.vowel2Gain).set(30,g.shineGain)
        .set(31,p.jawariStart).set(32,p.jawariPeak).set(33,p.jawariEnd).set(34,p.vowel1Start).set(35,p.vowel1Peak).set(36,p.vowel1End)
        .set(37,p.vowel2Start).set(38,p.vowel2Peak).set(39,p.vowel2End).set(40,p.shineHpStart).set(41,p.shineHpEnd)
        .set(46,Math.min(p.actualDur*.52,.19)*sr).set(47,.92);
    } else {
      const duration=shape.gradientDuration*(e.heldLong?6:1);
      const attack=Math.min(.032,Math.max(.005,duration*.18*softening));
      const release=Math.max(.01,Math.min(.14,Math.max(.03,duration*.42*softening))*.45);
      // Same safe-start and catch-up calculation as the old scheduled tone.
      const intendedPeak=intended+attack,actualPeak=start>=intendedPeak?start+.0035:intendedPeak;
      encoder.begin(reservation,0,type,e.heldLong,Math.ceil((duration+release+.08)*sr),mask|128)
        .set(8,e.toneFreq).set(9,shape.shapedCutoff).set(11,shape.shapedResonance).set(12,Math.max(2e-4,shape.shapedVolume*gainScale))
        .set(14,duration*sr).set(15,(actualPeak-start)*sr).set(42,duration*sr).set(43,release*sr);
    }
    return __wave39Submit(reservation,release,e.heldLong,ctx,e.activeScheduledTonesRef,ticket,e.holdSession);
  }catch(error){reservation.host.cancelUnsubmitted(reservation.token);if(ticket)release();return false;}
}
