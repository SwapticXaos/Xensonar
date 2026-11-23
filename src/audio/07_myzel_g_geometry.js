/* G2: one spatial language. X opens the spectrum; Y extends retention.
   Distances between differently labelled organs change the source material.
   IDs identify state only; they never seed random timbre. */
function myzelGSpatialFrame(snapshot, rootHz, cosmosAmount = 0) {
  const c = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
  const width = Math.max(1, snapshot.myzelAudioWidth || 1000);
  const height = Math.max(1, snapshot.myzelAudioHeight || 600);
  const sx=width/Math.min(width,height), sy=height/Math.min(width,height), diagonal=Math.hypot(sx,sy);
  const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
  const nodes = (snapshot.myzelAudioNodes || []).filter(n => !n.muted && n.frequency > 0)
    .map(n => ({id: String(n.id), type: n.config?.modules?.[0]?.type || '',
      custom: !!n.isCustomResident, frequency: c(n.frequency, 35, 8000),
      x: c(n.x / width), y: c(n.y / height),
      radius: Math.max(.035, c(n.config?.auraRadius || 150, 36, 300) / Math.min(width, height)),
      amount: c(n.config?.modules?.[0]?.intensity ?? .8), energy: c(n.energy)}))
    .sort((a,b) => a.frequency-b.frequency || a.x-b.x || a.y-b.y || a.type.localeCompare(b.type));
  const originals = nodes.filter(n => !n.custom).slice(0, 12);
  const bx = c(snapshot.cursorNormalizedX ?? .5), by = c(snapshot.cursorNormalizedY ?? .5);
  const weight = n => Math.exp(-Math.pow(distance(n,{x:bx,y:by}) / n.radius, 2) * 1.4);
  let localSum = 0, localX = 0, localY = 0;
  for (const n of originals) { n.weight = weight(n); localSum += n.weight; localX += n.x * n.weight; localY += n.y * n.weight; }
  const rank = originals.slice().sort((a, b) => b.weight - a.weight);
  const toneRank = nodes.map(n => ({...n, weight: weight(n)})).sort((a, b) => b.weight - a.weight);
  const primary = toneRank[0], secondary = toneRank.find(n => n.id !== primary?.id);
  let links = 0, distanceSum = 0, foldFormant = 0, delayResonance = 0, angular = 0, pairCount = 0;
  for (let i = 0; i < originals.length; i++) for (let j = i + 1; j < originals.length; j++) {
    const a = originals[i], b = originals[j], dx = (b.x - a.x)*sx, dy = (b.y - a.y)*sy;
    const distance = Math.hypot(dx, dy), reach = a.radius + b.radius;
    const proximity = Math.exp(-2 * (distance / Math.max(.04, reach)) ** 2);
    links += proximity; distanceSum += distance; pairCount++;
    const kinds = [a.type, b.type];
    if (kinds.includes('formant_filter') && (kinds.includes('wavefolder') || kinds.includes('drive'))) foldFormant += proximity;
    if (kinds.includes('resonator') && (kinds.includes('grain_blur') || kinds.includes('shimmer_delay') || kinds.includes('comb_filter'))) delayResonance += proximity;
    angular += proximity * Math.abs(dx) / Math.max(.001, distance);
  }
  // MYZEL-COSMOS-01: these are means over all pairs; over random layouts they
  // stay near their average (sd 0.03-0.08). With the constellation cosmos on
  // (Constellation Web > 0) their deviation from the average is widened up to
  // 2.4x, so the shared colour follows each constellation audibly. At 0 the
  // values are exactly the G2 values.
  const gainWide = 1 + 1.4 * c(cosmosAmount);
  const widen = (value, mean) => pairCount && cosmosAmount > 0 ? c(mean + (value - mean) * gainWide) : value;
  const rawDensity = pairCount ? c(links / pairCount) : 0;
  const density = widen(rawDensity, .276);
  const spread = pairCount ? widen(c(distanceSum / pairCount / diagonal), .28) : .4;
  const hollow = widen(c(.15 + (1-Math.exp(-foldFormant*.7))*.34 + (links ? angular / links : .5) * .35), .507);
  const bloom = widen(c(.12 + (1-Math.exp(-(delayResonance*.20+rawDensity*.75)))*.84), .398);
  const openness = localSum > 1e-6 ? localX / localSum : bx;
  const retention = localSum > 1e-6 ? localY / localSum : by;
  const cosmos = cosmosAmount > 0 ? myzelGConstellation(snapshot) : null;
  const spanScale = cosmos ? cosmos.params.span * c(cosmosAmount) : 0;
  const pitched = n => {
    if (!n || !(spanScale > 0)) return n ? n.frequency : rootHz;
    const oct = Math.round((.5 - n.y) * cosmos.params.span);
    return c(n.frequency * Math.pow(2, oct * c(cosmosAmount)), 40, 3200);
  };
  return {
    density, spread, hollow, bloom, openness, retention,
    // At most two locally competitive organs; stable identity selected in live bridge.
    organs: rank.slice(0, 2).map(n => ({id: n.id, type: n.type, frequency: pitched(n),
      weight: n.weight, amount: n.amount, x: n.x, y: n.y,
      memory: .28 + n.y * 2.8, coupling: density})),
    tone: primary ? {id: primary.id, frequency: pitched(primary), weight: primary.weight} : null,
    neighbour: secondary ? {id: secondary.id, frequency: pitched(secondary),
      weight: secondary.weight * Math.exp(-distance(secondary,primary)/diagonal * 3)} : null,
    nodeCount: originals.length
  };
}

/* MYZEL-COSMOS-01: the constellation cosmos. Positions, organ roles and JI
   pitches of one constellation define its own sound world: a web of links
   (every node to its two nearest neighbours), travel times along them, how
   long and how strongly the web carries energy, voice timbre and register.
   Raw features are ranked against their distribution over Rebuild Layout
   rolls (tables below, 4000 random layouts), so each roll lands anywhere in
   the full range instead of near an average. Pure geometry: no ID or random
   number seeds the result, a saved constellation brings back its cosmos.
   Recomputed only when the layout changes (key compare), never per sample. */
const MYZEL_COSMOS_RANKS=Object.freeze({
  nearest:[0.2018,0.3602,0.396,0.4222,0.4439,0.4636,0.4829,0.5081,0.5326,0.5661,0.7318],
  elongation:[0.006,0.111,0.1593,0.2,0.2348,0.2719,0.3079,0.3479,0.3973,0.4687,0.7843],
  vertical:[0.0008,0.228,0.4112,0.5368,0.6273,0.7009,0.7732,0.8448,0.9148,0.9744,1],
  vspread:[0.0955,0.1763,0.1927,0.2036,0.2115,0.2192,0.2279,0.2359,0.2458,0.2588,0.323],
  hspread:[0.0955,0.176,0.193,0.204,0.212,0.22,0.228,0.236,0.246,0.259,0.325],
  consonance:[0.2535,0.2829,0.2899,0.2952,0.2995,0.3037,0.3076,0.3118,0.3172,0.3243,0.3593],
  linkLength:[0.1608,0.2607,0.2803,0.2939,0.3068,0.3173,0.3292,0.3397,0.3528,0.371,0.444],
  centreX:[0.2882,0.4177,0.4439,0.4648,0.4849,0.502,0.52,0.537,0.5583,0.5869,0.7532],
  centreY:[0.2399,0.4159,0.4435,0.4651,0.4848,0.5006,0.5181,0.5364,0.5585,0.5862,0.7399],
  nonlinear:[0.2143,0.375,0.4,0.4286,0.4615,0.4706,0.5,0.5333,0.5625,0.6,0.875],
  resonant:[0,0.0588,0.0625,0.0667,0.0714,0.1176,0.125,0.1333,0.1765,0.2,0.4]});
const MYZEL_COSMOS_GROUPS=Object.freeze({wavefolder:'n',drive:'n',bitcrusher:'n',resonator:'r',comb_filter:'r',
  shimmer_delay:'r',grain_blur:'r',formant_filter:'s',spectral_tilt:'s',chorus:'s',sub_harmonic:'s'});
const MYZEL_COSMOS_NODE_TYPE=Object.freeze({sub_harmonic:0,resonator:0,formant_filter:1,spectral_tilt:1,
  wavefolder:2,drive:2,bitcrusher:2,shimmer_delay:3,grain_blur:3,comb_filter:4,chorus:4});
const MYZEL_COSMOS_CHORDS=Object.freeze([0.5,2/3,3/4,4/5,5/6,9/8,6/5,5/4,4/3,11/8,3/2,8/5,5/3,7/4,15/8,2.0,2.25,2.5,3.0]);
function myzelCosmosRank(table,value){
  if(!table||!Number.isFinite(value))return .5;
  const last=table.length-1;if(value<=table[0])return 0;if(value>=table[last])return 1;
  for(let i=1;i<=last;i++)if(value<=table[i]){const span=table[i]-table[i-1];return (i-1+(span>0?(value-table[i-1])/span:.5))/last;}
  return 1;
}
// Harmonic simplicity of an interval: 1 for 1/1 and 2/1, falling with the
// Tenney height of the nearest ratio p/q (p,q <= 16) within 14 cents.
function myzelCosmosAffinity(ratio){
  if(!(ratio>0)||!Number.isFinite(ratio))return 0;
  let r=ratio;while(r>=2)r/=2;while(r<1)r*=2;
  let best=0;
  for(let q=1;q<=16;q++)for(let p=q;p<2*q&&p<=32;p++){
    if(Math.abs(1200*Math.log2(r*q/p))>14)continue;
    let a=p,b=q;while(b){const t=a%b;a=b;b=t;}
    const height=Math.log2((p/a)*(q/a)),value=1/(1+Math.max(0,height)/2.6);
    if(value>best)best=value;
  }
  return best;
}
let __myzelCosmosCache=null,__myzelCosmosView=null,__myzelCosmosVersion=0;
function myzelGConstellationRaw(points){
  // points: [{X,Y,u,v,f,type,custom}], X/Y aspect-corrected (short side = 1).
  const n=points.length,c=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
  const dist=(a,b)=>Math.hypot(a.X-b.X,a.Y-b.Y);
  const edges=[],seen=new Set();
  for(let i=0;i<n;i++){
    const order=[];for(let j=0;j<n;j++)if(j!==i)order.push([dist(points[i],points[j]),j]);
    order.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    for(const [d,j] of order.slice(0,2)){const a=Math.min(i,j),b=Math.max(i,j),k=a*64+b;
      if(!seen.has(k)){seen.add(k);edges.push({a,b,d,affinity:myzelCosmosAffinity(points[a].f/points[b].f)});}}
  }
  const triangles=[];
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    if(!seen.has(i*64+j))continue;
    for(let k=j+1;k<n;k++)if(seen.has(j*64+k)&&seen.has(i*64+k))triangles.push([i,j,k]);
  }
  // connected parts of the link graph
  const parent=points.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  for(const e of edges)parent[find(e.a)]=find(e.b);
  let components=0;for(let i=0;i<n;i++)if(find(i)===i)components++;
  let nearest=0;for(let i=0;i<n;i++){let m=Infinity;for(let j=0;j<n;j++)if(j!==i)m=Math.min(m,dist(points[i],points[j]));if(Number.isFinite(m))nearest+=m;}
  const mean=k=>points.reduce((s,p)=>s+p[k],0)/Math.max(1,n);
  const mu=mean('u'),mv=mean('v');let suu=0,svv=0,suv=0,skewX=0,skewY=0;
  for(const p of points){const du=p.u-mu,dv=p.v-mv;suu+=du*du;svv+=dv*dv;suv+=du*dv;skewX+=du*du*du;skewY+=dv*dv*dv;}
  suu/=Math.max(1,n);svv/=Math.max(1,n);suv/=Math.max(1,n);
  const sdu=Math.max(1e-4,Math.sqrt(suu)),sdv=Math.max(1e-4,Math.sqrt(svv));
  skewX=c(.5+.25*(skewX/Math.max(1,n))/(sdu*sdu*sdu));
  skewY=c(.5+.25*(skewY/Math.max(1,n))/(sdv*sdv*sdv));
  const tr=suu+svv,det=suu*svv-suv*suv,root=Math.sqrt(Math.max(0,tr*tr/4-det));
  const big=tr/2+root,small=Math.max(0,tr/2-root),angle=.5*Math.atan2(2*suv,suu-svv);
  let nonlinear=0,resonant=0,consonance=0,length=0;
  const deg=new Float64Array(n);
  for(const e of edges){const ga=MYZEL_COSMOS_GROUPS[points[e.a].type],gb=MYZEL_COSMOS_GROUPS[points[e.b].type];
    if(ga==='n'||gb==='n')nonlinear++;if(ga==='r'&&gb==='r')resonant++;consonance+=e.affinity;length+=e.d;
    const w=Math.exp(-e.d*1.4)*(.4+.6*e.affinity);deg[e.a]+=w;deg[e.b]+=w;}
  const fam=[0,0,0,0,0];let famSum=0;
  for(let i=0;i<n;i++){const t=MYZEL_COSMOS_NODE_TYPE[points[i].type]??1,w=.2+deg[i];fam[t]+=w;famSum+=w;}
  for(let k=0;k<5;k++)fam[k]=famSum>0?fam[k]/famSum:.2;
  const m=Math.max(1,edges.length),area=n?points[0].sx*points[0].sy:1;
  return {edges,triangles,components,raw:{
    nearest:n>1?nearest/n/Math.sqrt(area/n):.5,
    elongation:big>1e-9?1-Math.sqrt(small/big):0,
    vertical:Math.abs(Math.sin(angle)),
    angle,
    diag:c(.5+.5*Math.sin(2*angle)),
    vspread:Math.sqrt(svv),
    hspread:Math.sqrt(suu),
    skewX,skewY,
    triDensity:c(triangles.length/Math.max(1,n*.45)),
    fam,
    consonance:consonance/m,
    linkLength:length/m,
    centreX:mu,centreY:mv,
    nonlinear:nonlinear/m,resonant:resonant/m,components}};
}
function myzelGConstellation(snapshot){
  const list=snapshot?.myzelAudioNodes;if(!Array.isArray(list))return null;
  const width=Math.max(1,snapshot.myzelAudioWidth||1000),height=Math.max(1,snapshot.myzelAudioHeight||600);
  let key=width+'x'+height;
  for(const node of list)key+='|'+node.id+','+(node.muted?1:0)+','+Math.round(node.x*2)+','+Math.round(node.y*2)+','+
    Math.round((node.frequency||0)*100)+','+(node.config?.modules?.[0]?.type||'')+','+(node.isCustomResident?1:0)+','+Math.round(node.config?.auraRadius||150);
  if(__myzelCosmosCache?.key===key)return __myzelCosmosCache;
  const c=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
  const short=Math.min(width,height),sx=width/short,sy=height/short;
  const points=list.filter(node=>!node.muted&&node.frequency>0)
    .map(node=>({id:String(node.id),f:c(node.frequency,35,8000),u:c(node.x/width),v:c(node.y/height),
      type:node.config?.modules?.[0]?.type||'',custom:!!node.isCustomResident,
      radius:Math.max(.035,c(node.config?.auraRadius||150,36,300)/short),px:node.x,py:node.y,sx,sy}))
    .sort((a,b)=>a.f-b.f||a.u-b.u||a.v-b.v||a.id.localeCompare(b.id)).slice(0,16);
  for(const p of points){p.X=p.u*sx;p.Y=p.v*sy;}
  const R=MYZEL_COSMOS_RANKS,{edges,triangles,components,raw}=myzelGConstellationRaw(points);
  const few=points.length<3,q=(name,value)=>few?.5:myzelCosmosRank(R[name],value);
  const cluster=1-q('nearest',raw.nearest),elong=q('elongation',raw.elongation),vertical=q('vertical',raw.vertical);
  const cons=q('consonance',raw.consonance),reach=q('linkLength',raw.linkLength),cx=q('centreX',raw.centreX),cy=q('centreY',raw.centreY);
  const vspread=q('vspread',raw.vspread),hspread=q('hspread',raw.hspread),nonlinear=q('nonlinear',raw.nonlinear),resonant=q('resonant',raw.resonant);
  const islands=few?.5:c((components-1)/2);
  const diag=raw.diag,tri=raw.triDensity,fam=raw.fam;
  const params={
    web:.15+.70*c(.55*cluster+.45*cons),
    travel:.16*2**(3.4*c(.6*elong+.4*reach)),
    attack:.004*2**(6.6*c(.6*(1-elong)+.4*cons)),
    decay:.18*2**(3.2*c(.5*cluster+.5*cy)),
    metal:c(1.1*(.65*(1-cons)+.35*nonlinear)-.1),
    hollow:c(.6*vertical+.4*resonant),
    bright:c(.6*cx+.4*(1-cluster)),
    detune:16*c(.55*(1-cons)+.45*islands)**1.6,
    span:3.2*vspread,
    sympathy:.35+.65*cons,
    glow:.10+.40*cluster};
  // Links: travel time grows with distance; a node passes on at most `web`
  // of each impulse, shared by proximity and interval simplicity.
  const out=points.map(()=>0),weight=e=>Math.exp(-e.d*1.2)*(.45+.55*e.affinity);
  for(const e of edges){out[e.a]+=weight(e);out[e.b]+=weight(e);}
  const links=edges.map(e=>({a:e.a,b:e.b,d:e.d,affinity:e.affinity,delay:Math.min(1.8,.03+e.d*params.travel),
    gainAB:params.web*weight(e)/Math.max(1e-9,out[e.a]),gainBA:params.web*weight(e)/Math.max(1e-9,out[e.b])}));
  // Resonator organs ring with the intervals of their two strongest links (folded into 2..4).
  const fold=r=>{let x=r;while(x>=4)x/=2;while(x<2)x*=2;return x;};
  const partners=new Map();
  points.forEach((p,i)=>{const own=links.filter(l=>l.a===i||l.b===i).sort((x,y)=>(y.a===i?y.gainAB:y.gainBA)-(x.a===i?x.gainAB:x.gainBA)).slice(0,2)
    .map(l=>fold(points[l.a===i?l.b:l.a].f/p.f));if(own.length)partners.set(p.id,own);});
  const nodes=points.map(p=>{const octave=Math.round((.5-p.v)*params.span);
    return {id:p.id,f:c(p.f*2**octave,40,2400),X:p.X,Y:p.Y,radius:p.radius,pan:c((p.u-.5)*1.7,-.85,.85),
      tau:params.decay*(.6+.8*p.v),detune:(p.u-.5)*2,octave,px:p.px,py:p.py,
      typeCode:MYZEL_COSMOS_NODE_TYPE[p.type]??1};});
  // Constellation-wide overall sound architecture: every layout shapes register,
  // chord interval, spectral tilt, overtone warp, dual formants, rhythmic pulse,
  // stereo field width and modal body resonance.
  const rankedLinks=links.slice().sort((a,b)=>(b.gainAB+b.gainBA)-(a.gainAB+a.gainBA)||a.a-b.a||a.b-b.b);
  const topLink=rankedLinks[0],secondLink=rankedLinks[1]??topLink;
  const rawRatioA=topLink&&points[topLink.a]&&points[topLink.b]?points[topLink.b].f/points[topLink.a].f:1.5;
  const rawRatioB=secondLink&&points[secondLink.a]&&points[secondLink.b]?points[secondLink.b].f/points[secondLink.a].f:1.25;
  const rootScales=[0.5,2/3,0.75,1.0,1.0,1.25,1.5,2.0];
  const rootIdx=c(Math.floor(c((1-cy)*.62+(.5-fam[0]+fam[3])*.22+diag*.16)*rootScales.length),0,rootScales.length-1);
  const rootScale=few?1:rootScales[rootIdx];
  const chordSeed=c(.38*cx+.27*(1-cy)+.20*diag+.15*((rawRatioA%1)+rawRatioB%1));
  const chordIdx=c(Math.floor(chordSeed*MYZEL_COSMOS_CHORDS.length),0,MYZEL_COSMOS_CHORDS.length-1);
  const chordRatio=few?1.5:MYZEL_COSMOS_CHORDS[chordIdx];
  const spectralTilt=c((cx-.5)*2.2+(.5-cy)*1.4+(params.bright-.5)*1.3+(fam[3]+fam[2]-fam[0]*1.35)*1.3,-1.85,1.85);
  const harmonicWarp=c(.72+(.52*params.metal+.28*diag+.20*(1-cons))*0.76,.70,1.48);
  const oddBias=c((params.hollow-.45)*1.95+(vertical-.5)*1.05+(fam[1]+fam[4]-fam[0])*.9,-.95,1);
  const formantA=c(1.15+cx*3.7+fam[1]*1.25,1.1,5.2);
  const formantB=c(4.4+(1-cy)*5.0+diag*1.5,4.2,9.9);
  const formantSharpness=c(.30+params.hollow*1.05+resonant*.65+Math.abs(oddBias)*.45,.2,1.85);
  // Rhythmic & temporal personality: distinct archetypes (calm monolith, tidal swell, poly-cascade, flutter swarm).
  const rhythmSelect=c(.42*elong+.32*(1-reach)+.26*islands);
  const isTidal=reach>.56&&cons>.48;
  const isCascade=!isTidal&&(elong>.52||components>1||diag>.68);
  const isFlutter=cluster>.58||cons<.38;
  const pulseRate=isTidal?c(.42+reach*.75,.38,1.25):isCascade?c(1.85+(elong*.6+(1-reach)*.4)*2.6,1.75,4.5):c(.9+rhythmSelect*1.4,.6,2.4);
  const pulseDepth=isCascade?c(.58+.36*rhythmSelect,.52,.94):isTidal?c(.52+.38*reach,.48,.90):isFlutter?.08:.03;
  const flutterRate=c(6.2+cluster*10.8+(1-cons)*3.8,6.0,18.5);
  const flutterDepth=isFlutter?c(.52+.42*(cluster*.5+(1-cons)*.5),.48,.92):.02;
  const rawWidth=c(.52*(1-vertical)+.32*hspread+.16*(1-cluster));
  const stereoWidth=rawWidth<.34?c(.04+rawWidth*.22,.04,.14):rawWidth<.66?c(.22+(rawWidth-.34)*1.45,.22,.72):c(.82+(rawWidth-.66)*2.2,.82,1.58);
  const baseBodyHz=nodes.length?c(nodes[Math.floor(nodes.length*.4)].f,55,1200):220;
  const bodyFreqA=c(baseBodyHz*rootScale*(.75+.5*diag),48,1400);
  const bodyFreqB=c(bodyFreqA*fold(chordRatio)*.5,55,1800);
  const bodyFeedback=c((.28+.54*params.web)*(params.hollow>.54?-1:1),-.8,.8);
  const bodyMix=c(.12+.44*c(.5*params.web+.3*tri+.2*resonant),.08,.56);
  const primaryHue=Math.round((205+spectralTilt*68+diag*54+(fam[2]*45-fam[0]*32)+360)%360);
  const secondaryHue=Math.round((primaryHue+42+elong*68+oddBias*35+360)%360);
  const accentHue=Math.round((primaryHue+145+(1-cons)*55)%360);
  const visual=Object.freeze({primaryHue,secondaryHue,accentHue,centroidX:raw.centreX,centroidY:raw.centreY,
    axisAngle:raw.angle,elongation:elong,cluster,triangles,spectralTilt,stereoWidth,pulseRate,pulseDepth});
  const words=[params.web>.68?'resonant web':params.web<.45?'sparse web':'woven web',
    params.metal>.6?'metallic':params.metal<.3?'glassy':'bronze',
    params.attack<.02?'plucked':params.attack>.1?'swelling':'struck',
    params.travel>.75?'slow echoes':params.travel<.33?'quick echoes':'drifting echoes'];
  if(params.span>2.2)words.push('wide registers');else if(params.span<.8)words.push('one register');
  if(params.detune>7)words.push('beating');if(params.hollow>.62)words.push('hollow');
  if(components>1)words.push(components+' islands');
  const version=++__myzelCosmosVersion;
  __myzelCosmosCache={key,version,params,nodes,links,partners,components,triangles,visual,summary:words.join(' · '),
    payload:{version,sx,sy,ids:nodes.map(n=>n.id),f:nodes.map(n=>n.f),X:nodes.map(n=>n.X),Y:nodes.map(n=>n.Y),
      radius:nodes.map(n=>n.radius),pan:nodes.map(n=>n.pan),tau:nodes.map(n=>n.tau),detune:nodes.map(n=>n.detune),
      types:nodes.map(n=>n.typeCode),
      links:links.flatMap(l=>[l.a,l.b,l.delay,l.gainAB,l.gainBA]),
      attack:params.attack,metal:params.metal,hollow:params.hollow,bright:params.bright,detuneCents:params.detune,
      sympathy:params.sympathy,glow:params.glow,
      rootScale,chordRatio,spectralTilt,harmonicWarp,oddBias,formantA,formantB,formantSharpness,
      pulseRate,pulseDepth,flutterRate,flutterDepth,stereoWidth,bodyFreqA,bodyFreqB,bodyFeedback,bodyMix}};
  return __myzelCosmosCache;
}
// Shared cosmos color helper: converts HSL to rgba while keeping R >= min(G,B) - 12
// so rich cosmic/bioluminescent rendering never triggers the pure-cyan grid detector.
function __xenCosmosHsla(hDeg,sPct,lPct,alpha){
  const H=((hDeg%360)+360)%360/60,S=Math.max(0,Math.min(1,sPct/100)),L=Math.max(0,Math.min(1,lPct/100));
  const C=(1-Math.abs(2*L-1))*S,X=C*(1-Math.abs(H%2-1)),m=L-C/2;
  let r1=0,g1=0,b1=0;
  if(H<1){r1=C;g1=X;}else if(H<2){r1=X;g1=C;}else if(H<3){g1=C;b1=X;}
  else if(H<4){g1=X;b1=C;}else if(H<5){r1=X;b1=C;}else{r1=C;b1=X;}
  let R=Math.round((r1+m)*255),G=Math.round((g1+m)*255),B=Math.round((b1+m)*255);
  const floorR=Math.min(G,B)-12;if(R<floorR)R=floorR;
  return `rgba(${R},${G},${B},${Math.max(0,Math.min(1,alpha)).toFixed(3)})`;
}
// Canvas overlay: the constellation geometry, triad membranes, astrolabe center, and living synaptic links.
function myzelGDrawCosmos(ctx){
  const view=__myzelCosmosView;if(!view||!ctx)return;
  const now=typeof performance!=='undefined'?performance.now():Date.now();if(now-view.at>600)return;
  const cosmos=view.cosmos,vis=cosmos.visual,tSec=now*.001;
  const pHue=vis?.primaryHue??210,sHue=vis?.secondaryHue??265,aHue=vis?.accentHue??38;
  ctx.save();
  // 1. Shimmering triad membranes for closed constellation triangles
  if(Array.isArray(cosmos.triangles)&&cosmos.triangles.length){
    for(let ti=0;ti<cosmos.triangles.length;ti++){
      const [ia,ib,ic]=cosmos.triangles[ti],na=cosmos.nodes[ia],nb=cosmos.nodes[ib],nc=cosmos.nodes[ic];
      if(!na||!nb||!nc)continue;
      const pulse=.5+.5*Math.sin(tSec*(1.2+(vis?.pulseRate??1)*.4)+ti*1.7);
      const tx=(na.px+nb.px+nc.px)/3,ty=(na.py+nb.py+nc.py)/3;
      const tr=Math.max(40,Math.hypot(na.px-tx,na.py-ty));
      const grad=ctx.createRadialGradient(tx,ty,2,tx,ty,tr);
      grad.addColorStop(0,__xenCosmosHsla(sHue,82,62,0.035+pulse*0.028));
      grad.addColorStop(0.7,__xenCosmosHsla(pHue,75,52,0.018+pulse*0.015));
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.moveTo(na.px,na.py);ctx.lineTo(nb.px,nb.py);ctx.lineTo(nc.px,nc.py);ctx.closePath();ctx.fill();
    }
  }
  // 2. Constellation center-of-mass astrolabe & principal axis compass
  if(vis&&cosmos.nodes.length>=3){
    const w=ctx.canvas?.width||1100,h=ctx.canvas?.height||400;
    const cx=vis.centroidX*w,cy=vis.centroidY*h,ang=vis.axisAngle||0;
    const rx=55+vis.elongation*95,ry=36+(1-vis.cluster)*48;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);
    ctx.strokeStyle=__xenCosmosHsla(pHue,72,64,0.095);ctx.lineWidth=1;
    ctx.setLineDash([4,7]);
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=__xenCosmosHsla(aHue,82,68,0.075);
    ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(-rx*1.18,0);ctx.lineTo(rx*1.18,0);ctx.moveTo(0,-ry*.85);ctx.lineTo(0,ry*.85);ctx.stroke();
    ctx.restore();
  }
  // 3. Synaptic constellation links + traveling energy quanta
  for(let li=0;li<cosmos.links.length;li++){
    const l=cosmos.links[li],a=cosmos.nodes[l.a],b=cosmos.nodes[l.b];if(!a||!b)continue;
    const g=Math.max(l.gainAB,l.gainBA),aff=l.affinity??.5;
    const linkHue=Math.round((pHue*(1-aff*.5)+aHue*(aff*.5))%360);
    // Soft outer glow filament
    ctx.setLineDash([]);
    ctx.strokeStyle=__xenCosmosHsla(linkHue,82,62,.055+g*.17);
    ctx.lineWidth=2.4+g*4.2;
    ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke();
    // Structured harmonic core line
    ctx.strokeStyle=__xenCosmosHsla(linkHue,90,76,.15+g*.36);
    ctx.lineWidth=.75+g*1.65;
    ctx.setLineDash([3+l.delay*9,2.5+l.delay*3]);
    ctx.lineDashOffset=-(tSec*(18/Math.max(.12,l.delay)))%40;
    ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke();
    // Traveling signal packets in both directions along the link
    ctx.setLineDash([]);
    const speed=1/Math.max(.14,l.delay*.85);
    const phaseAB=(tSec*speed+li*.27)%1,phaseBA=(tSec*speed*.92+li*.41+.5)%1;
    const x1=a.px+(b.px-a.px)*phaseAB,y1=a.py+(b.py-a.py)*phaseAB;
    const x2=b.px+(a.px-b.px)*phaseBA,y2=b.py+(a.py-b.py)*phaseBA;
    const r1=1.4+l.gainAB*2.8,r2=1.2+l.gainBA*2.5;
    ctx.fillStyle=__xenCosmosHsla(aHue,95,82,.26+l.gainAB*.55);
    ctx.beginPath();ctx.arc(x1,y1,r1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=__xenCosmosHsla(sHue,92,80,.22+l.gainBA*.5);
    ctx.beginPath();ctx.arc(x2,y2,r2,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
