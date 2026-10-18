/* Emilia: reciprocal spatial material compiler. A constellation is ONE excited
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
  const bands=[];
  for(let band=0;band<3;band++){
    const original=base.bands[band],eigen=original.vectors;
    const frequencies=[],decayRates=[],pickup=[];
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
    }
    bands.push({...original,frequencies,decayRates,pickup});
  }
  // A common source/body model replaces the v2 one-way oscillator drive. The
  // six modal registers belong to the same spatial body, not six effect layers.
  const sources=positions.map((p,i)=>{
    const bond=clamp(degree[i]/1.6,0,1),x=p.x,y=p.y;
    const edge=clamp(strain[i],0,1),role=base.nodes[i].role;
    const hardness=clamp((1-y)*.8+edge*.25+(role==='drive'?.22:0),0,1);
    const harmonic=.28+.65*(1-y)+bond*.16;
    const impulse=.05+hardness*.78+(role==='fold'?.10:0);
    const friction=.012+y*y*(.22+x*.3)*(1-bond*.35);
    const center=1.3+x*8.5+direction[i]*1.2,width=.8+y*3.4;
    const odd=clamp(.5+Math.sin(y*5+direction[i]*3)*.42,.06,.94);
    const partials=Array.from({length:12},(_,h)=>{
      const k=h+1,brightness=.26+x*1.48;
      const roll=Math.exp(-(k-1)/(1.2+brightness*5.8));
      const peak=Math.exp(-(((k-center)/width)**2))*x*.72;
      const parity=k===1?1:k%2?(.25+odd):(.25+1-odd);
      return (k===1?.7:roll*parity+peak)*(role==='sub'&&k>4?.55:1);
    });
    const scale=1/Math.sqrt(partials.reduce((s,v)=>s+v*v,0));
    return Object.freeze({partials:partials.map(v=>v*scale),harmonic,impulse,friction,hardness,
      sustain:.35+y*.62,transientSec:.006+y*y*.19+bond*.022,
      textureHz:400+x*6200,resistance:.15+y*.75+bond*.3});
  });
  const registers=[1,1,1,1.48,2.12,3.03],bodyBands=[],ports=[];
  for(let b=0;b<6;b++){
    const original=bands[Math.min(2,b)],vectors=original.vectors;
    const frequencies=original.frequencies.map((f,j)=>{
      let x=0,y=0,bond=0;
      for(let i=0;i<count;i++){const v=vectors[i*count+j]**2;x+=v*positions[i].x;y+=v*positions[i].y;bond+=v*degree[i];}
      if(b===0)return f;
      // Harmonic capture vs elastic detuning varies with space. It is a timbre
      // property; every frequency still follows the same Carrier root.
      const ratio=f*registers[b],metal=clamp(y*.55+Math.abs(direction[j])*.28-bond*.18,.015,.7);
      return Math.max(.035,Math.round(ratio)*(1-metal)+ratio*metal);
    });
    const pickup=original.pickup.map((v,j)=>{
      let vertical=0;for(let i=0;i<count;i++)vertical+=vectors[i*count+j]**2*positions[i].y;
      // Long, friction-led materials otherwise accumulate a nearly pure bass
      // mode while their shorter upper modes disappear. Balance their shared
      // registers before recipe calibration; do not distort the final signal.
      const rubbing=clamp((vertical-.45)/.55,0,1);
      const balance=b===0?1-rubbing*.35:1+rubbing*rubbing*18;
      return v*balance*(b<3?1:[.34,.22,.14][b-3]);
    });
    const decayRates=original.decayRates.map(v=>v*(b<3?1:1+(b-2)*.65));
    bodyBands.push(Object.freeze({...original,frequencies,pickup,decayRates}));
    const harmonic=[],impulse=[],friction=[],sustain=[],response=[];
    for(let i=0;i<count;i++)for(let j=0;j<count;j++){
      const p=positions[i],v=vectors[i*count+j],src=sources[i];
      const ratio=frequencies[j]/Math.max(.05,base.nodes[i].ratio*base.nodes[i].partials[0]);
      let spectral=0;
      for(let h=1;h<=12;h++)spectral+=src.partials[h-1]*Math.exp(-(((h-ratio)/(.38+p.y*.5))**2));
      const entry=1+.42*Math.sin((p.x*2-p.y+direction[i])*Math.PI+b*.85);
      const tonal=b===0?1:b===1?.65:Math.pow(.66,b-1);
      harmonic.push(v*entry*tonal);
      impulse.push(v*(.25+p.x*.85)*(b===0?.3:1)*(.7+strain[i]*.3));
      friction.push(v*(.22+p.y*.8)*(b===0?.15:1)*(.65+Math.abs(direction[i])*.4));
      sustain.push(v*entry*spectral*(b===0?.075:.052));
      response.push(clamp((b/5-.35)*1.7+(p.x-.5)*.8+(p.y-.5)*.35+direction[i]*.3,-1,1));
    }
    ports.push(Object.freeze({harmonic,impulse,friction,sustain,response}));
  }
  return Object.freeze({...base,key:'emilia-material-v1:'+base.key,bands:bodyBands,
    emiliaMaterial:Object.freeze({version:1,sources,ports,feedback:.68}),
    emiliaInteraction:'reciprocal-material-v1'});
}
