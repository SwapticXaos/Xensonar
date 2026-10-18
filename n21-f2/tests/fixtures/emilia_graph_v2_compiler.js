/* Emilia: spatial material compiler, v2. A constellation is ONE excited
   coupled-modal body. Absolute position controls the excitation spectrum and
   formant memory, while adjacency and orientation redistribute the normal
   modes, damping and how the source drives them. No parallel FX chain.
   The original Nodal V1 plan and PCM stay untouched. */
function compileEmiliaNetworkColor(model) {
  const base=__XenNodalModel.compile(model), count=base.nodes.length;
  if(!count)return base;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const positions=base.nodes.map(n=>model.nodes.find(p=>p.id===n.id));
  const degree=new Float64Array(count),direction=new Float64Array(count),strain=new Float64Array(count);
  for(const edge of base.edges){
    const a=edge.a,b=edge.b,pa=positions[a],pb=positions[b];
    const dx=pb.x-pa.x,dy=pb.y-pa.y;
    degree[a]+=edge.weight;degree[b]+=edge.weight;
    direction[a]+=edge.weight*(dx-.75*dy);direction[b]-=edge.weight*(dx+.75*dy);
    const s=edge.weight*Math.hypot(dx*.75,dy*1.2);
    strain[a]+=s;strain[b]+=s;
  }
  const excitations=positions.map((p,i)=>{
    const x=clamp(p.x,0,1),y=clamp(p.y,0,1),bond=clamp(degree[i]/1.6,0,1);
    // Local spectrum: brightness comes from the absolute location; a node's
    // neighbours change the harmonic distribution, not only its loudness.
    const open=x*x*(.65+.35*x),odd=clamp(.5+.45*Math.sin(5*y+direction[i]*3),.08,.95);
    const hollow=1-odd,partial=[
      1,
      .018+open*(.48+hollow*.70)+bond*.10,
      .012+open*(.35+odd*.85)+bond*.12,
      .008+open*(.30+hollow*.66)+Math.max(0,direction[i])*.17,
      .005+open*(.27+odd*.48)+strain[i]*.14,
      .003+open*(.19+hollow*.37)+Math.max(0,-direction[i])*.10
    ];
    return {partials:partial,scale:1/(1+open*.25+bond*.07),
      sustain:clamp(.50+y*.42+bond*.07,.42,.98),
      transientSec:.055+y*.32+bond*.12};
  });
  const bands=[];
  const fixedModes=[],modeDrive=[];
  for(let band=0;band<3;band++){
    const original=base.bands[band],eigen=original.vectors;
    const frequencies=[],decayRates=[],pickup=[],fixed=[],drive=[];
    for(let mode=0;mode<count;mode++){
      let stretch=0,relax=0,contrast=0,brightness=0,vertical=0,connected=0;
      for(let i=0;i<count;i++){
        const participation=eigen[i*count+mode]**2;
        brightness+=participation*positions[i].x;
        vertical+=participation*positions[i].y;
        connected+=participation*degree[i];
      }
      for(const edge of base.edges){
        const na=positions[edge.a],nb=positions[edge.b];
        const dx=nb.x-na.x,dy=nb.y-na.y;
        const a=eigen[edge.a*count+mode],b=eigen[edge.b*count+mode];
        const opposition=(a-b)**2,concordance=(a+b)**2;
        const s=edge.weight*(.2+.5*Math.abs(dx)+.7*Math.abs(dy));
        stretch+=s*(opposition*.85+concordance*.12)*(dx*.9+dy*.8);
        relax+=s*(opposition*.5+concordance*.15)*(.3+Math.abs(dy));
        contrast+=edge.weight*(opposition-concordance*.3)*(.4+Math.abs(dx));
      }
      const upper=band===0?0:band===1?1:2;
      const shift=clamp(stretch*(band===0?.035:band===1?.25:.39),-.28,.28);
      frequencies.push(Math.max(.035,original.frequencies[mode]*Math.exp(shift)));
      decayRates.push(original.decayRates[mode]*Math.exp(clamp(relax*(band===0?.03:band===1?-.38:-.50),-.65,.3)));
      // Older implementations buried virtually all of the energy in band 0:
      // the 2nd / 3rd coupled-modal bands were excited at only .22 / .08.
      // This LOCAL modal redistribution exposes the material spectrum without
      // adding a second independent oscillator after the resonator.
      const open=brightness*brightness*(.65+.35*brightness);
      const presence=band===0?clamp(1.18-open*.52,.65,1.2)
        :band===1?clamp(.95+open*7.5+connected*.65, .80, 8)
        :clamp(.80+open*12.0+connected*.85+Math.abs(contrast)*.4,.8,13);
      pickup.push(original.pickup[mode]*presence*Math.exp(clamp(contrast*upper*.13,-.22,.22)));
      // The network is actively excited at its own collective modal frequencies.
      // A strictly harmonic single oscillator fails to feed narrow, detuned
      // eigenmodes; most of them otherwise never get audible energy.
      drive.push(band===0?0:band===1
        ?(.02+open*.47+connected*.09)*Math.max(.3,Math.min(1.6,Math.abs(original.pickup[mode])))
        :(.007+open*.32+connected*.08)*Math.max(.3,Math.min(1.6,Math.abs(original.pickup[mode]))));
      const mix=band===0?0:clamp((band===1?.06:.10)*brightness,0,.12);
      const formantHz=band===1?360+brightness*1350+vertical*320:740+brightness*2650+vertical*600;
      fixed.push({mix,hz:formantHz});
    }
    bands.push({...original,frequencies,decayRates,pickup});
    fixedModes.push(fixed);modeDrive.push(drive);
  }
  return Object.freeze({...base,bands,emiliaExcitation:excitations,
    emiliaFixedModes:fixedModes,emiliaModeDrive:modeDrive,emiliaInputDrive:.07,emiliaInteraction:'graph-spectrum-v2'});
}
