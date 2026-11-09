/* History owns snapshots, but may retain shared source buffers too. Account
   unique backing buffers across BOTH stacks; never sample/copy their PCM. */
const __ForgeHistoryBudget = (() => {
  function measure(value) {
    const objects=new Set(),buffers=new Set();let bytes=0;
    function visit(v) {
      if(typeof v==='string'){bytes+=v.length*2;return;}
      if(!v || typeof v!=='object' || objects.has(v))return;
      objects.add(v);
      if(ArrayBuffer.isView(v)){visit(v.buffer);return;}
      if(v instanceof ArrayBuffer){if(!buffers.has(v)){buffers.add(v);bytes+=v.byteLength;}return;}
      if(typeof Blob==='function' && v instanceof Blob){bytes+=v.size;return;}
      if(typeof AudioBuffer==='function' && v instanceof AudioBuffer){bytes+=v.length*v.numberOfChannels*4;return;}
      bytes+=64;
      if(Array.isArray(v)){bytes+=v.length*8;for(const item of v)visit(item);}
      else for(const key of Object.keys(v)){bytes+=key.length*2+8;visit(v[key]);}
    }
    visit(value);return bytes;
  }
  function create({maxBytes=192*1024*1024,maxEntries=30}={}) {
    if(!Number.isSafeInteger(maxBytes)||maxBytes<0||!Number.isSafeInteger(maxEntries)||maxEntries<0)throw Error('Invalid history budget.');
    function diagnostics(state) {return {bytes:measure([state.undoStack,state.redoStack]),maxBytes,maxEntries,undoEntries:state.undoStack.length,redoEntries:state.redoStack.length};}
    function limit(undo,redo,preferred='undo') {
      const undoStack=[...undo],redoStack=[...redo];
      const first=preferred==='redo'?undoStack:redoStack,second=preferred==='redo'?redoStack:undoStack;
      const remove=()=>{if(first.length)first.shift();else second.shift();};
      while(undoStack.length+redoStack.length>maxEntries)remove();
      while((undoStack.length||redoStack.length)&&measure([undoStack,redoStack])>maxBytes)remove();
      return {undoStack,redoStack};
    }
    return Object.freeze({limit,diagnostics,measure});
  }
  const standard=create();return Object.freeze({...standard,create});
})();
