/* F4 revision 1. Continuous mass flow is authoritative. Bands/links are a
   confidence-weighted description, never a claim about drawing history. */
async function analyzeFractaliaRelations(material,{check=()=>{},onProgress=()=>{}}={}) {
 const {columns:C,rows:R,field}=material,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),eps=1e-18;
 const raw=[],smooth=[],bands=[],profile=new Float64Array(R),strength=[],links=[];
 const radius=Math.max(1,Math.round(R/128));let first=C,last=0;
 for(let x=0;x<C;x++) {
  check();const col=Float64Array.from(field.slice(x*R,(x+1)*R)),s=new Float64Array(R);let sum=0;
  for(let y=0;y<R;y++){profile[y]+=col[y];sum+=col[y];let mass=0,w=0;for(let k=-radius;k<=radius;k++){if(y+k<0||y+k>=R)continue;const a=radius+1-Math.abs(k);mass+=col[y+k]*a;w+=a}s[y]=mass/w}
  if(sum>eps){first=Math.min(first,x);last=x}raw.push(col);smooth.push(s);strength.push(sum);
  const peak=Math.max(...s),peaks=[];
  for(let y=0;y<R;y++)if(s[y]>peak*.06&&s[y]>0&&(y===0||s[y]>s[y-1])&&(y===R-1||s[y]>=s[y+1]))peaks.push(y);
  const nodes=[];
  for(let i=0;i<peaks.length;i++){
   const a=i?Math.floor((peaks[i-1]+peaks[i])/2)+1:0,b=i+1<peaks.length?Math.floor((peaks[i]+peaks[i+1])/2):R-1;
   let mass=0,moment=0;for(let y=a;y<=b;y++){mass+=col[y];moment+=col[y]*y}if(mass<=eps)continue;
   const center=moment/mass;let variance=0;for(let y=a;y<=b;y++)variance+=col[y]*(y-center)**2;
   nodes.push({id:x+':'+i,x,center,width:Math.sqrt(variance/mass),mass,confidence:clamp(s[peaks[i]]/Math.max(peak,eps))});
  }
  bands.push(nodes);
  if(x>0)for(const node of nodes){const candidates=bands[x-1].map(p=>({from:p.id,to:node.id,weight:p.mass*Math.exp(-.5*((node.center-p.center)/(R*.035+node.width+p.width))**2)}));const total=candidates.reduce((a,b)=>a+b.weight,0);for(const link of candidates)if(link.weight>total*.025&&total>eps)links.push({...link,weight:link.weight/total})}
  onProgress((x+1)/C*.5);if(x%4===3)await new Promise(r=>setTimeout(r,0));
 }
 if(first===C)throw Error('The instrument contains no material');
 // A continuous lower energy quantile defines the relative reference. A faint
 // bridge must not join two threshold regions and abruptly move their anchor.
 const profileMass=profile.reduce((a,b)=>a+b,0),referenceMass=profileMass*.1;let cumulative=0,base=0;
 for(let y=0;y<R;y++){if(cumulative+profile[y]>=referenceMass){base=y-.5+clamp((referenceMass-cumulative)/Math.max(profile[y],eps));break}cumulative+=profile[y]}
 // Effective simultaneous bands, not eight forced subdivisions of a surface.
 const count=Math.max(1,Math.min(8,Math.max(...bands.map(bs=>bs.filter(b=>b.mass>=strength[b.x]*.025).length))));
 const total=profile.reduce((a,b)=>a+b,0),anchors=[];
 for(let k=0;k<count;k++){const target=(k+.5)/count*total;let sum=0,y=0;for(;y<R-1;y++){sum+=profile[y];if(sum>=target)break}anchors.push(y)}
 const modes=anchors.map((center,k)=>({id:'material-'+k,center,points:[],mass:0}));
 const descriptors=[];
 for(let x=first;x<=last;x++){
  check();const col=raw[x],sum=strength[x],moments=modes.map(()=>({mass:0,mean:0,variance:0}));
  // Soft allocation conserves each cell's mass, including diffuse/faint material.
  for(let y=0;y<R;y++){if(col[y]<=0)continue;const weights=modes.map(m=>Math.exp(-.5*((y-m.center)/(R*.07))**2)+1e-14),den=weights.reduce((a,b)=>a+b,0);for(let k=0;k<count;k++){const v=col[y]*weights[k]/den;moments[k].mass+=v;moments[k].mean+=v*y;moments[k].variance+=v*y*y}}
  const frame=[];
  for(let k=0;k<count;k++){const m=modes[k],a=moments[k],center=a.mass>eps?a.mean/a.mass:m.center,width=Math.sqrt(Math.max(0,a.variance/Math.max(a.mass,eps)-center*center))/R;
   const bend=(center-m.center)/R;m.center=center;m.mass+=a.mass;
   frame.push({center,width,mass:a.mass,bend,near:0,branch:0});
  }
  for(let k=0;k<count;k++){const a=frame[k];for(let j=0;j<count;j++)if(j!==k){const b=frame[j],balance=2*Math.sqrt(a.mass*b.mass)/Math.max(eps,a.mass+b.mass);a.near+=Math.exp(-Math.abs(a.center-b.center)/(R*.11))*balance}a.near=clamp(a.near/Math.max(1,count-1));
   let parentWeight=0,parentSpread=0;for(const b of bands[x]){const w=b.mass*Math.exp(-.5*((b.center-a.center)/(R*.08))**2);parentWeight+=w;parentSpread+=w*Math.abs(b.center-a.center)/R}a.branch=clamp(parentSpread/Math.max(eps,parentWeight)*8);
   modes[k].points.push({...a,u:(x-first)/Math.max(1,last-first)});
  }
  let change=0;for(let y=0;y<R;y++)change+=Math.abs(col[y]/Math.max(eps,sum)-(x>first?raw[x-1][y]/Math.max(eps,strength[x-1]):col[y]/Math.max(eps,sum)));
  descriptors.push({u:(x-first)/Math.max(1,last-first),change,near:frame.reduce((a,b)=>a+b.near,0)/count,width:frame.reduce((a,b)=>a+b.width,0)/count});
  onProgress(.5+.5*(x-first+1)/Math.max(1,last-first+1));if(x%4===3)await new Promise(r=>setTimeout(r,0));
 }
 for(const m of modes){const den=Math.max(eps,m.mass);m.signature={center:m.points.reduce((a,p)=>a+p.center*p.mass,0)/den,width:m.points.reduce((a,p)=>a+p.width*p.mass,0)/den,near:m.points.reduce((a,p)=>a+p.near*p.mass,0)/den,branch:m.points.reduce((a,p)=>a+p.branch*p.mass,0)/den,bend:m.points.reduce((a,p)=>a+Math.abs(p.bend)*p.mass,0)/den,mass:m.mass/total};delete m.center}
 // Quantiles of an integrated change density. Every column contributes; dense
 // control curves remain independent of the 9/17 expensive table states.
 const stateCount=R===256?17:9,weights=descriptors.map(d=>1+2*d.change+3*d.near),weightTotal=weights.reduce((a,b)=>a+b,0),statePositions=[0];
 for(let s=1;s<stateCount-1;s++){const target=weightTotal*s/(stateCount-1);let sum=0,at=0;for(;at<weights.length-1;at++){sum+=weights[at];if(sum>=target)break}const u=(at+clamp((target-(sum-weights[at]))/weights[at]))/Math.max(1,weights.length);statePositions.push(clamp(u,statePositions[statePositions.length-1]+1e-5,1-(stateCount-s)*1e-5))}statePositions.push(1);
 check();return {revision:1,columns:C,rows:R,first,last,base,modes,descriptors,bands,links,statePositions};
}
if(typeof module!=='undefined'&&module.exports)module.exports=analyzeFractaliaRelations;
