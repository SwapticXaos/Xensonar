/* The SAME source configuration/compiler used by HarmonicXplorE Direct.
   HX is now the excitation engine inside Emilia, not a copied sine spectrum.
   Serialized operators run inside the per-note reciprocal synthesis voice. */
function compileEmiliaHXSource(model,geometry){
  const {centerX:x,centerY:y,spread,anisotropy}=geometry;
  const position=Math.max(0,Math.min(3.999,x*4)),index=Math.floor(position),blend=position-index;
  const series=['numOdd','natural','numPrime','inharmonic','numFibo'];
  const synthLab={presetId:'neutral-body',paramsPatch:{sine:0,triangle:.04+(1-y)*.16,
    sawtooth:.90*(1-x)+.12,square:.10+x*.86,sub:0,overtone:0,detuneCents:0,
    drive:0,outputGain:1}};
  const compile=seriesType=>RR({synthLab,harmonicXplore:{profileId:'harmonic-xplore-natural-ribbon',
    seriesType,phase:'phaseUp',count:6,rolloff:.40+(1-y)*.55,
    registerFold:'balanced',detailDensity:1,detailMode:'dense'}});
  const a=compile(series[index]),b=compile(series[index+1]);
  // Same oscillator expansion as HX Direct. No independent hidden preset or
  // post-render HX layer: these operators feed the node network itself.
  const left=nU(a.partials,12),right=nU(b.partials,12);
  const operators=left.map((op,i)=>{
    const other=right[i]??op,ratio=i%6===0?1:op.freqMul*(1-blend)+other.freqMul*blend;
    const foundation=ratio<1.01?.035+.18*(1-y)**2:1;
    return Object.freeze({type:op.type,ratio,gain:(op.gain*(1-blend)+other.gain*blend)*foundation,
      detune:op.detune*(1-blend)+other.detune*blend});
  });
  return Object.freeze({version:1,source:'harmonic-xplore-direct-carrier',configHashes:[a.configHash,b.configHash],
    series:[a.seriesType,b.seriesType],blend,operators,
    feedback:.24+.58*Math.min(1,spread*2)+.16*y,
    phaseReturn:.45+3.2*x*x+1.4*Math.max(0,anisotropy),
    foldDrive:2.5+5.5*y+4*x,
    foldMix:.08+.78*x*x,
    asymmetry:(x-.5)*.75,
    rootReject:.72+.27*y,
    bodyFeed:.70+.25*y});
}
