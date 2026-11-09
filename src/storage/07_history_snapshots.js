/* Session-only history pages, never a project/archive format. Each snapshot
   owns direct references to immutable pages, not a chain of previous deltas.
   This lets oldest entries expire without invalidating a later Undo/Redo. */
const __ForgeHistorySnapshots = (() => {
  const pageSize=4096,kind='forge-history-pages-v1';
  const fields=['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'];
  function capture(grid,body,previous) {
    const metrics={copiedBytes:0,sharedBytes:0,copiedPages:0,sharedPages:0};
    function array(input,old) {
      const pages=[],bits=new Uint32Array(input.buffer,input.byteOffset,input.length);
      for(let start=0,index=0;start<input.length;start+=pageSize,index++){
        const length=Math.min(pageSize,input.length-start),candidate=old?.length===input.length?old.pages[index]:null;
        let same=!!candidate&&candidate.length===length;
        if(same){const prior=new Uint32Array(candidate.buffer,candidate.byteOffset,candidate.length);for(let i=0;i<length;i++)if(bits[start+i]!==prior[i]){same=false;break;}}
        if(same){pages.push(candidate);metrics.sharedBytes+=length*4;metrics.sharedPages++;}
        else{pages.push(input.slice(start,start+length));metrics.copiedBytes+=length*4;metrics.copiedPages++;}
      }
      return Object.freeze({length:input.length,pages:Object.freeze(pages)});
    }
    function record(input,old,stamp=false){
      if(!input)return null;
      const result={width:input.width,height:input.height};
      for(const field of fields)result[field]=array(input[field],old?.[field]);
      if(!stamp){result.initialized=input.initialized;result.sourceSignature=input.sourceSignature;result.stampMeta=record(input.stampMeta,old?.stampMeta,true);}
      return Object.freeze(result);
    }
    const result={kind,width:grid.width,height:grid.height,data:array(grid.data,previous?.data),grain:array(grid.grainData,previous?.grain),body:record(body,previous?.body),metrics};
    Object.freeze(metrics);return Object.freeze(result);
  }
  function restore(snapshot,grid,body) {
    if(snapshot.kind!==kind||snapshot.width!==grid.width||snapshot.height!==grid.height)throw Error('History raster dimensions do not match the workspace.');
    function check(value,length){if(!value||value.length!==length||!Array.isArray(value.pages)||value.pages.length!==Math.ceil(length/pageSize))throw Error('Invalid history pages.');for(let i=0;i<value.pages.length;i++)if(!(value.pages[i] instanceof Float32Array)||value.pages[i].length!==Math.min(pageSize,length-i*pageSize))throw Error('Invalid history page length.');}
    function copy(value,target){for(let i=0;i<value.pages.length;i++)target.set(value.pages[i],i*pageSize);return target;}
    function record(input,stamp=false){
      if(!input)return null;
      const result={width:input.width,height:input.height},length=input.width*input.height;
      if(!Number.isSafeInteger(length)||length<0||length>grid.data.length)throw Error('Invalid history body dimensions.');
      for(const field of fields){check(input[field],length);result[field]=copy(input[field],new Float32Array(length));}
      if(!stamp){result.initialized=input.initialized;result.sourceSignature=input.sourceSignature;result.stampMeta=record(input.stampMeta,true);}
      return result;
    }
    check(snapshot.data,grid.data.length);check(snapshot.grain,grid.grainData.length);
    // Validate and allocate before changing live data. Raster restoration writes
    // directly into the existing arrays, avoiding a contiguous 8 MiB scratch copy.
    const prepared=record(snapshot.body);
    copy(snapshot.data,grid.data);copy(snapshot.grain,grid.grainData);Object.assign(body,prepared);
  }
  return Object.freeze({capture,restore,pageSize});
})();
