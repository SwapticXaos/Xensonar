/* Dual Donor renderer: one variant ("aligned", DUAL-ALIGN-01/02). Older blueprints (revision original/revised) are rendered with it too;
 * completed older results stay playable and show as previous render. The factory registers itself from the lab room. */
let __F35636DualFactory=null,__F35636DualInstance=null;
const __F35636DualDSP=Object.freeze({
  register(revision,factory){__F35636DualFactory=factory;__F35636DualInstance=null;},
  factoryFor(){if(!__F35636DualFactory)throw Error('The Dual Donor renderer is not loaded.');return [ 'aligned',__F35636DualFactory];},
  forPlan(){this.factoryFor();return __F35636DualInstance??(__F35636DualInstance=__F35636DualFactory());},
  get version(){return 'dual-variant-router-f3.57.2';},
  validate(plan,sources,settings){return this.forPlan(plan).validate(plan,sources,settings);},
  key(plan,sources,settings){return this.forPlan(plan).key(plan,sources,settings);},
  render(plan,sources,settings,options){return this.forPlan(plan).render(plan,sources,settings,options);}
});
const __F35636DualWorker=(()=>{
  function render(plan,sources,settings,options={}){
    __F35636DualDSP.validate(plan,sources,settings);
    const factory=__F35636DualDSP.factoryFor(plan)[1];
    const script='const dsp=('+factory.toString()+')();self.postMessage({ready:true});self.onmessage=async e=>{try{const r=await dsp.render(e.data.plan,e.data.sources,e.data.settings,{onProgress:p=>self.postMessage({progress:p})});self.postMessage({result:r},[r.samples.buffer]);}catch(error){self.postMessage({error:error.message,name:error.name});}}';
    const copy=s=>({samples:s.samples.slice(),sampleRate:s.sampleRate,duration:s.duration,revision:s.revision});
    return __F35640OfflineJob.run({script,options,label:'Dual Donor',
      payload:()=>({plan,sources:{A:copy(sources.A),B:copy(sources.B)},settings}),
      transfer:wire=>[wire.sources.A.samples.buffer,wire.sources.B.samples.buffer],
      decode:m=>{if(!(m.result?.samples instanceof Float32Array)||!m.result.samples.length)throw Error('Incomplete hybrid result.');return m.result;}
    }).promise;
  }
  return Object.freeze({render});
})();