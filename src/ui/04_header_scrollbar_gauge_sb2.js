
/* An inert one-time native scrollbar gauge; NOT a fake scrollbar.
   Runs before React mounts, and recalibrates on viewport/zoom resize only.
   It never changes body overflow or scrollbar ownership. */
(function () {
  var root=document.documentElement, previous=null;
  function measureNativeScrollbar() {
    if (!document.body) return;
    var box=document.createElement('div');
    box.style.cssText='position:absolute;left:-10000px;top:-10000px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none;';
    document.body.appendChild(box);
    var width=Math.max(0,box.offsetWidth-box.clientWidth);
    box.remove();
    if (width!==previous) {
      root.style.setProperty('--xen-header-native-gutter',width+'px');
      previous=width;
    }
  }
  measureNativeScrollbar();
  window.addEventListener('resize',measureNativeScrollbar,{passive:true});
})();
