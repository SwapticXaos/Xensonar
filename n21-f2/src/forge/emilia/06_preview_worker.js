/* A sustained Emilia audition is offline work. Run its original PCM renderer
   and calibration in a disposable worker; a newer request owns the only job. */
function createEmiliaPreviewWorker({kernelFactory,renderPCM,recipeTrim,audibleHz,engine,createWorker}){
 let active=null,url=null,disposed=false;
 const abort=()=>new DOMException('Emilia preview superseded','AbortError');
 function source(){return `
 const __XenNodalDSP=(${kernelFactory.toString()})();
 const ENGINE=${JSON.stringify(engine)},clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),trimCache=new Map();
 const normalized=input=>input;let currentPlan;
 const compileEmiliaNetworkColor=()=>currentPlan;
 const __carrierAudibleHz=${audibleHz.toString()};
 ${recipeTrim.toString()}
 ${renderPCM.toString()}
 onmessage=async({data})=>{try{currentPlan=data.plan;
 const track={at:t=>({hz:220,gain:t<1.48?.72:0}),gainAt:t=>t<1.48?.72:0};
 const result=await renderPCM({...data,tracks:[track]});
 postMessage({result},[result.left.buffer,result.right.buffer]);
 }catch(error){postMessage({error:String(error.message||error)})}};`;}
 function cancel(){if(!active)return;const job=active;active=null;job.worker.terminate();job.reject(abort());}
 function render(args){
  if(disposed)return Promise.reject(abort());cancel();
  return new Promise((resolve,reject)=>{
   let worker;
   try{
    if(createWorker)worker=createWorker(source());
    else{if(!url)url=URL.createObjectURL(new Blob([source()],{type:'text/javascript'}));worker=new Worker(url);}
    const job={worker,reject};active=job;
    const finish=(error,result)=>{if(active!==job)return;active=null;worker.terminate();error?reject(error):resolve(result)};
    worker.onmessage=({data})=>data.error?finish(Error(data.error)):finish(null,data.result);
    worker.onerror=event=>finish(Error('Emilia preview worker: '+event.message));
    worker.postMessage(args);
   }catch(error){worker?.terminate();active=null;reject(error)}
  });
 }
 function dispose(){cancel();disposed=true;if(url){URL.revokeObjectURL(url);url=null;}}
 return Object.freeze({render,cancel,dispose});
}
