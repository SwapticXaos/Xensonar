/* Emilia Timbre Weave: source synthesis AND spatial signal routing.
   Existing HX series, Cecilia spectral material and Myzel-style formant/comb
   structures participate inside each interacting node. Every coordinate shapes
   sound construction directly; no constellation hash selects a hidden preset. */
// Exact local basis cache. The global family mix, geometry, feedback,
// formant shifts and eigenmodes are ALWAYS recomputed. Bounded to avoid
// retaining an unbounded history of drag positions.
const __emiliaLocalSpectrumCache=new Map();
function __emiliaLocalSpectrum(x,y,role,strength){
  const key=JSON.stringify([x,y,role,strength]);
  if(__emiliaLocalSpectrumCache.has(key)){
    const found=__emiliaLocalSpectrumCache.get(key);
    __emiliaLocalSpectrumCache.delete(key);__emiliaLocalSpectrumCache.set(key,found);
    return found;
  }
  const basis=Array.from({length:32},(_,h)=>{
    const k=h+1,isOdd=(k%2)===1,parity=isOdd?1:.08+.20*y;
    return Object.freeze({
      reed:parity/Math.pow(k,.58+y*.46),
      spectralDenominator:Math.pow(k,.36+x*.3),
      struck:Math.exp(-h/(6+y*14))*(isOdd?.62:1)/Math.pow(k,.23),
      bowed:(isOdd?.70:1)/Math.pow(k,.30+y*.12),
      hollow:(isOdd?.08:1)/Math.pow(k,.15),
      tilt:role==='tilt'?Math.pow(k,(x-.5)*strength*.4):1,
    });
  });
  __emiliaLocalSpectrumCache.set(key,basis);
  if(__emiliaLocalSpectrumCache.size>64)__emiliaLocalSpectrumCache.delete(__emiliaLocalSpectrumCache.keys().next().value);
  return basis;
}
function compileEmiliaNetworkColor(model){
  const base=__XenNodalModel.compile(model),n=base.nodes.length;
  if(!n)return base;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const points=base.nodes.map(node=>model.nodes.find(p=>p.id===node.id));
  const degree=Array(n).fill(0),dx=Array(n).fill(0),dy=Array(n).fill(0),links=Array.from({length:n},()=>[]);
  for(const e of base.edges){
    degree[e.a]+=e.weight;degree[e.b]+=e.weight;
    dx[e.a]+=e.weight*(points[e.b].x-points[e.a].x);dx[e.b]-=e.weight*(points[e.b].x-points[e.a].x);
    dy[e.a]+=e.weight*(points[e.b].y-points[e.a].y);dy[e.b]-=e.weight*(points[e.b].y-points[e.a].y);
    links[e.a].push({node:e.b,weight:e.weight});links[e.b].push({node:e.a,weight:e.weight});
  }
  const centerX=points.reduce((s,p)=>s+p.x,0)/n,centerY=points.reduce((s,p)=>s+p.y,0)/n;
  const spread=Math.sqrt(points.reduce((s,p)=>s+(p.x-centerX)**2+(p.y-centerY)**2,0)/n);
  const extentX=Math.sqrt(points.reduce((s,p)=>s+(p.x-centerX)**2,0)/n),extentY=Math.sqrt(points.reduce((s,p)=>s+(p.y-centerY)**2,0)/n);
  const anisotropy=(extentX-extentY)/Math.max(.04,extentX+extentY);
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>(points[a].x*.68+points[a].y*.32)-(points[b].x*.68+points[b].y*.32)||base.nodes[a].id.localeCompare(base.nodes[b].id));
  const prime=__emiliaSource_ZQ(9,'numPrime'),inharmonic=__emiliaSource_ZQ(9,'inharmonic'),odd=__emiliaSource_ZQ(16,'numOdd');
  const sources=points.map((p,i)=>{
    const x=p.x,y=p.y,bond=clamp(degree[i]),role=base.nodes[i].role;
    // The constellation sets a common material character. Independent node
    // families mixed at equal pickup used to average back to the same body.
    // Local geometry now articulates this shared character inside the network.
    const position=clamp(centerX+(x-centerX)*.20+dx[i]*.14+dy[i]*.06)*5;
    const family=Array.from({length:6},(_,k)=>Math.exp(-((position-k)**2)/(.10+spread*.15)));
    const total=family.reduce((a,b)=>a+b,0);for(let k=0;k<6;k++)family[k]/=total;
    const vowel=clamp(centerY*.70+y*.20+x*.10+dy[i]*.20)*3.999,vowelIndex=Math.floor(vowel),vowelMix=vowel-vowelIndex;
    const formants=__emiliaSource_Vk[vowelIndex].map((f,k)=>(f*(1-vowelMix)+__emiliaSource_Vk[vowelIndex+1][k]*vowelMix)*Math.pow(2,(x-.5)*.45));
    const vocalConfig={vowel,formantShift:(x-.5)*5};
    const localBasis=__emiliaLocalSpectrum(x,y,role,p.strength);
    const partials=Array.from({length:32},(_,h)=>{
      const k=h+1,isOdd=odd.includes(k),local=localBasis[h];
      const reed=local.reed;
      const vocal=__emiliaSource_A3e(__emiliaSource_x3e(k*220,vocalConfig))*2.3;
      const shell=Math.exp(-(((k-(2+y*9+dx[i]*5))/(1.4+y*2.4))**2));
      const spectral=(.16+shell)/local.spectralDenominator;
      const struck=local.struck;
      const bowed=local.bowed;
      const hollow=local.hollow;
      let a=family[0]*reed+family[1]*vocal+family[2]*spectral+family[3]*struck+family[4]*bowed+family[5]*hollow;
      if(k===1)a=Math.max(.17,a*.38);
      // Vertical structure changes the spectral slope of the WHOLE body;
      // horizontal/vertical graph aspect changes odd/even emphasis.
      const bodySlope=(centerY-.5)*1.20+anisotropy*.28;
      const graphParity=isOdd?1+anisotropy*.30:1-anisotropy*.30;
      return a*Math.pow(k,bodySlope)*graphParity*(1+.16*Math.sin(k*(.44+y*1.2)+dx[i]*4+dy[i]*3))*local.tilt;
    });
    const norm=Math.sqrt(partials.reduce((s,v)=>s+v*v,0));for(let h=0;h<32;h++)partials[h]/=norm;
    const nonharmonic=Array.from({length:8},(_,k)=>({
      ratio:Math.min(26,inharmonic[k+1]*(.68+y*.15)+prime[k+1]*(.32-y*.15)),
      gain:(family[3]*.45+family[5]*.8)*Math.exp(-k/(2.1+y*4))*.15,
      decay:.025+(1-y)*.05+k*.014,phase:k*.73+x*2.4+dy[i]*3
    }));
    return Object.freeze({x,y,family,partials,nonharmonic,formants,
      phaseShape:family[0]*.04+family[2]*.14+family[3]*.12+family[5]*.08+(role==='fold'?.65*p.strength:0),
      fm:family[2]*.20+family[5]*.08+(role==='drive'?.55*p.strength:0),
      spectralDecay:family[3]*.35+family[5]*.15+family[2]*.22,
      formantMix:clamp(family[1]*.86+family[4]*.10+(role==='formant'?.12*p.strength*y:0),0,.92),
      combMix:clamp(family[4]*.65+family[5]*.28+family[3]*.13,0,.82),
      combFeedback:.22+family[4]*.36+y*.08,combRatio:1+(x-.5)*.18+dy[i]*.18,
      pulseDecay:.012+(1-y)*.13,
      sustain:clamp(.24+family[0]*.58+family[1]*.54+family[2]*.59+family[4]*.38,.2,.9),
      breath:family[1]*(.02+y*.11)+family[4]*.014,
      dampingHz:700+x*5200+y*2300,
      networkDepth:clamp(model.coupling/.2)*(.30+bond*.65)*(.45+p.strength*.45),
      pickup:p.pickup*(.7+y*.3),level:p.excitation*(.55+p.strength*.30),
      neighborhood:{dx:dx[i],dy:dy[i],degree:degree[i]}
    });
  });
  return Object.freeze({...base,key:'emilia-hx-reciprocal-v4:'+base.key,
    emiliaWeave:Object.freeze({version:4,sources,links,order,centerX,centerY,spread,anisotropy,hxSource:compileEmiliaHXSource(model,{centerX,centerY,spread,anisotropy})}),
    emiliaInteraction:'hx-reciprocal-v4',cost:Math.max(base.cost,n*3)});
}
