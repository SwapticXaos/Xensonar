/* One master bypass for the live tuning/impulse grid. The historical stored
   key is retained so existing sessions and the RFL switch share one owner. */
const __xenEmptyGrid = Object.freeze([]);
const __xenMutedGridViews = new WeakMap();
const __xenMutedGridProperties = Object.fromEntries(Object.entries({
  gridOn:false,lockCursorToGrid:false,quantizeOn:false,gridTuning:'12edo',gridMode:'chromatic',
  manualGridMutedSteps:__xenEmptyGrid,manualGridStepOffsets:__xenEmptyGrid
}).map(([key,value])=>[key,{value,enumerable:true}]));
function __xenGridMuted(params) {
  return params?.rootFollowImpulsRasterMuted === true;
}
function __xenLiveGridParams(params) {
  if (!__xenGridMuted(params)) return params;
  let view = __xenMutedGridViews.get(params);
  if (!view) {
    // Read-only live view, never a persistence/export object. Inheritance keeps
    // continuously updated volumes/root values current without cloning every
    // audio/animation tick. The authored parameter object remains untouched.
    view = Object.freeze(Object.create(params,__xenMutedGridProperties));
    __xenMutedGridViews.set(params, view);
  }
  return view;
}
