/* P2B isolated Nodal cold compile. Live renderer and its voice code are unchanged.
   Controller jobs never compute a whole instrument or its pitch packet on the
   main thread when Web Workers are available. No DSP output is produced here. */
function nodalPrepareWorkerEntry(modelFactory,kernelFactory){
  const model=modelFactory(),control=kernelFactory(),plans=new Map();
  self.onmessage=({data})=>{
    const {id,instrument,sampleRate,contours}=data;
    try{
      if(data.type==='forget'){plans.delete(data.planId);return;}
      if(data.type==='pitches'){
        const plan=plans.get(data.planId),frequencies=data.frequencies;
        if(!plan)throw new Error('Nodal frequency plan no longer retained');
        if(!Array.isArray(frequencies)||frequencies.length>64)throw new Error('Invalid frequency packet');
        // P3B6: moving roots are prepared off the UI thread, independently
        // from the live Worklet's render deadline.
        const prepared=control.preparePacket(plan,frequencies,sampleRate);
        self.postMessage({type:'pitches',id,prepared});return;
      }
      // Original P2B cold preparation, including the first pitch package.
      self.resolveNodalArticulationFields=()=>contours;
      const normalized=model.normalize(instrument),plan=model.compile(normalized);
      const prepared=control.preparePacket(plan,[plan.referenceHz??220],sampleRate,true);
      plans.set(id,plan);
      self.postMessage({id,plan,prepared});
    }catch(error){self.postMessage({id,error:String(error?.message??error)});}
  };
}
function createNodalPreparationCoordinator({modelFactory,kernelFactory}){
  let worker=null,disposed=false,seq=0;const jobs=new Map();
  function failAll(error){for(const job of jobs.values()){clearTimeout(job.timer);job.reject(error);}jobs.clear();}
  function dispose(){if(disposed)return;disposed=true;failAll(new Error('Nodal preparation cancelled'));worker?.terminate();worker=null;}
  function start(){
    if(worker)return worker;
    if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')throw new Error('Nodal preparation Worker unavailable');
    const body='('+nodalPrepareWorkerEntry.toString()+')('+modelFactory.toString()+','+kernelFactory.toString()+');';
    const url=URL.createObjectURL(new Blob([body],{type:'text/javascript'}));
    try{worker=new Worker(url,{name:'xensonar-nodal-prepare'});}finally{URL.revokeObjectURL(url);}
    worker.onmessage=({data})=>{
      const job=jobs.get(data.id);if(!job)return;
      jobs.delete(data.id);clearTimeout(job.timer);
      if(data.error)job.reject(new Error(data.error));
      else if(job.type==='pitches')job.resolve(data.prepared);
      else job.resolve({plan:data.plan,prepared:data.prepared,workerPlanId:data.id});
    };
    worker.onerror=event=>{event.preventDefault?.();const failure=new Error('Nodal preparation Worker failed');failAll(failure);worker?.terminate();worker=null;};
    return worker;
  }
  function prepare(instrument,sampleRate,contours){
    if(disposed)return Promise.reject(new Error('Nodal preparation cancelled'));
    try{start();}catch(error){return Promise.reject(error);}
    const id=++seq;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{jobs.delete(id);reject(new Error('Nodal background preparation timed out'));},12000);
      jobs.set(id,{resolve,reject,timer,type:'prepare'});
      try{worker.postMessage({type:'prepare',id,instrument,sampleRate,contours});}
      catch(error){jobs.delete(id);clearTimeout(timer);reject(error);}
    });
  }
  function prepareFrequencies(planId,frequencies,sampleRate){
    if(disposed)return Promise.reject(new Error('Nodal preparation cancelled'));
    try{start();}catch(error){return Promise.reject(error);}
    const id=++seq;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{jobs.delete(id);reject(new Error('Nodal frequency preparation timed out'));},5000);
      jobs.set(id,{resolve,reject,timer,type:'pitches'});
      try{worker.postMessage({type:'pitches',id,planId,frequencies,sampleRate});}
      catch(error){jobs.delete(id);clearTimeout(timer);reject(error);}
    });
  }
  function forget(planId){if(!disposed&&worker&&planId!=null)worker.postMessage({type:'forget',planId});}
  return Object.freeze({prepare,prepareFrequencies,forget,dispose});
}
