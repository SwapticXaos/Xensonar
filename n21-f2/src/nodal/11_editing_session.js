// Editing state is separate from DSP, library revisions and Melodic ownership.
const __XenNodalEditing = (() => {
  const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  function createHistory(limit = 24) {
    const past = [], future = [];
    let gesture = null;
    return {
      get canUndo() { return past.length > 0; },
      get canRedo() { return future.length > 0; },
      begin(value) { if (!gesture) gesture = {before: value, recorded: false, future:future.slice()}; },
      end(value) {
        if (gesture?.recorded && value !== undefined && same(gesture.before,value)) {
          past.pop(); future.splice(0,future.length,...gesture.future);
        }
        gesture = null;
      },
      record(before, after) {
        if (same(before, after)) return false;
        if (!gesture || !gesture.recorded) {
          past.push(gesture ? gesture.before : before);
          if (past.length > limit) past.shift();
          if (gesture) gesture.recorded = true;
        }
        future.length = 0;
        return true;
      },
      undo(value) { this.end(value); if (!past.length) return null; future.push(value); return past.pop(); },
      redo(value) { this.end(value); if (!future.length) return null; past.push(value); return future.pop(); }
    };
  }
  function createDraftStore(storage, key, onError, clock = globalThis) {
    let latest = null, pending = null, dirty = false;
    function flush() {
      if (pending !== null) clock.clearTimeout(pending);
      pending = null;
      if (!dirty || !latest) return true;
      try { storage.setItem(key, JSON.stringify(latest)); dirty = false; return true; }
      catch (error) { onError?.(error); return false; }
    }
    return {
      update(value) {
        latest = value; dirty = true;
        if (pending !== null) clock.clearTimeout(pending);
        pending = clock.setTimeout(flush, 180);
      },
      flush
    };
  }
  function removeNode(instrument, id) {
    if (instrument.nodes.length <= 1 || !instrument.nodes.some(n => n.id === id)) return instrument;
    const next = {...instrument, nodes: instrument.nodes.filter(n => n.id !== id),
      blockedEdges: instrument.blockedEdges.filter(pair => !pair.includes(id))};
    if (instrument.edgePolarities) next.edgePolarities = instrument.edgePolarities.filter(pair => !pair.includes(id));
    return next;
  }
  return Object.freeze({same, createHistory, createDraftStore, removeNode});
})();
