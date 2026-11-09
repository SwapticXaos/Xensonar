  if(!ready){ready=jF(ctx,__MyzelGSource,'Myzel G2 spatial organ synth');__myzelGLoaderCache.set(ctx,ready);
    ready.catch(()=>{if(__myzelGLoaderCache.get(ctx)===ready)__myzelGLoaderCache.delete(ctx);});}
  await ready;if(engine.disposed||ctx.state==='closed')return false;
  const node=new AudioWorkletNode(ctx,'xensonar-myzel-g',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  engine.nodes.push(node);engine.worklet=node;node.connect(engine.output);
  node.port.onmessage=event=>{
    if(engine.disposed||engine.worklet!==node||engine.workletFailed||event.data?.type!=='myzel-audible'||engine.workletAudible)return;
    engine.workletAudible=true;
    engine.fallbackGain.gain.setTargetAtTime(0,ctx.currentTime,.07);
    // Keep the native fallback for the fade, then retire its real DSP sources.
    engine.parkFallback();
  };
  node.onprocessorerror=()=>{
    if(engine.disposed||engine.worklet!==node)return;
    engine.error='G2 processor error';engine.workletFailed=true;
    // A stopped OscillatorNode is one-shot. Restore a fresh, independently
    // owned native fallback instead of trying to restart retired sources.
    engine.restoreFallback();
  };
  // Do not mute the fallback until the actual Worklet PCM reports non-silence.
  node.port.postMessage(engine.lastControls||{active:0});
  return true;
}
