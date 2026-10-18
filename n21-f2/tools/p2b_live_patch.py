from pathlib import Path
p=Path('src/nodal/04_audio_runtime.js');s=p.read_text()
old='const plans = new Map(), pending = new Map(), active = new Map(), preparedReferences = new WeakMap(), pendingStarts = new Map(), pins = new Map(); let sequence = 0, disposed = false, activeCost = 0;'
new='''const plans = new Map(), pending = new Map(), active = new Map(), preparedReferences = new WeakMap(), pendingStarts = new Map(), pins = new Map(), preparing = new Map(); let sequence = 0, disposed = false, activeCost = 0;
    // Browser live surfaces: the eigenmodes, spectral banks and initial
    // coefficients are generated off the main/audio threads. Fake/legacy Node
    // harnesses without Web Workers retain the previous control path.
    const background = policy.prepareOnControl && typeof Worker === 'function' && typeof createNodalPreparationCoordinator === 'function'
      ? createNodalPreparationCoordinator({modelFactory:createNodalInstrumentModel,kernelFactory}) : null;'''
assert old in s;s=s.replace(old,new,1)
start=s.index('    async function prepare(instrument) {')
end=s.index('    function pin(instrument)',start)
replacement='''    async function prepare(instrument) {
      if (disposed) throw new Error('Nodal player disposed');
      if (!Object.isFrozen(instrument)) throw new Error('Prepare a normalized immutable Nodal instrument');
      const key = model.semanticKey(instrument);
      if (plans.has(key)) {preparedReferences.set(instrument,plans.get(key));return plans.get(key).promise;}
      // The same timbre can be selected by Wave and Particle concurrently.
      // A single background job owns its compile and later Worklet install.
      if (preparing.has(key)) {
        const record=await preparing.get(key);preparedReferences.set(instrument,record);return record;
      }
      const work=(async()=>{
        let compiled,prepared;
        if(background){
          // Shared envelope interpretation is currently owned by the Melodic
          // editor. The bounded curve resolution stays on the host; acoustic
          // plan, tables and prepared coefficients run only in the worker.
          const contours=typeof resolveNodalArticulationFields==='function'
            ?resolveNodalArticulationFields(instrument.articulation)
            :{volumeCurve:null,pitchCurve:null};
          if(typeof resolveNodalArticulationFields!=='function' && (instrument.articulation.volumeEnvelope||instrument.articulation.pitchEnvelope))throw new Error('Shared envelope resolver unavailable');
          const result=await background.prepare(instrument,context.sampleRate,contours);
          compiled=result.plan;prepared=result.prepared;
        }else{
          // Compatibility only: runtimes without a Web Worker use P2A's
          // pre-onset control preparation. No synchronous fallback is
          // attempted after a worker fails in a supported browser.
          compiled=model.compile(instrument);
          prepared=control?.preparePacket(compiled,[compiled.referenceHz??220],context.sampleRate,true);
        }
        if(disposed)throw new Error('Nodal player disposed');
        const cost=typeof policy.costForPlan==='function'?policy.costForPlan(compiled,context.sampleRate):compiled.cost;
        if(compiled.silent||!Number.isFinite(cost)||cost<compiled.cost||cost>maxCost)throw new Error('Nodal plan exceeds live budget');
        if(plans.size>=16){
          const removable=Array.from(plans.entries()).find(([,record])=>record.ready&&!pins.get(record)&&!Array.from(active.values()).some(v=>v.planId===record.id));
          if(!removable)throw new Error('Nodal live plan bank full');
          plans.delete(removable[0]);pins.delete(removable[1]);node.port.postMessage({type:'forget',id:removable[1].id});
        }
        const plan=cost===compiled.cost?compiled:{...compiled,cost},id='plan-'+(++sequence),record={id,plan,ready:false};
        record.promise=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{
            pending.delete(id);plans.delete(key);
            if(!disposed)node.port.postMessage({type:'forget',id});
            reject(new Error('Nodal plan preparation timed out'));
          },5000);
          pending.set(id,{key,timer,resolve:()=>{record.ready=true;resolve(record);},reject});
        });
        plans.set(key,record);
        try{node.port.postMessage({type:'plan',id,plan,paced:!!control,prepared});}
        catch(error){const entry=pending.get(id);if(entry){clearTimeout(entry.timer);pending.delete(id);plans.delete(key);entry.reject(error);}}
        return record.promise;
      })();
      preparing.set(key,work);
      try{const record=await work;preparedReferences.set(instrument,record);return record;}
      finally{if(preparing.get(key)===work)preparing.delete(key);}
    }
'''
s=s[:start]+replacement+s[end:]
old='function dispose() { if (disposed) return; disposed = true; if(stageTimer!==null)clearTimeout(stageTimer);'
new='function dispose() { if (disposed) return; disposed = true; background?.dispose();preparing.clear(); if(stageTimer!==null)clearTimeout(stageTimer);'
assert old in s;s=s.replace(old,new,1);p.write_text(s)

p=Path('src/nodal/12_surface_runtime.js');s=p.read_text()
start=s.index('  function options(existing=[])')
end=s.index('  function configure(next)',start)
s=s[:start]+'''  function options(existing=[]){
    // Do not compile every library instrument on React render. The compiler
    // belongs to P2B's asynchronous preparation, not the dropdown.
    let entries=[];try{entries=library.list();}catch{}
    return [...existing,...entries.filter(entry=>entry.instrument?.nodes?.some(n=>!n.muted))
      .map(entry=>({value:'nodal:'+entry.id+'@'+entry.revision,label:'Nodal · '+entry.instrument.name,
        hint:'Direkte Synthese · '+entry.instrument.nodes.length+' Nodes',originLabel:'Nodal Sounddesign'}))];
  }
'''+s[end:]
old='''    try{const plan=planFor(instrument);if(plan.silent||surfaceCost(plan,contextAtRequest?.sampleRate)>16)throw new Error('Nodal instrument exceeds live budget');}
    catch(error){slot.phase='error';slot.error=String(error.message??error);return null;}'''
assert old in s;s=s.replace(old,'''    // Heavy compile + DSP costs are validated when the async player is ready.
    // An earlier menu render must not compile the instrument synchronously.''',1)
p.write_text(s)
