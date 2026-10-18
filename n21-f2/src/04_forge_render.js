
/* One recipe and one revision own the complete offline result. No live-audio work. */
// One hybrid recipe owner; storage is accessed lazily inside protected reads/writes.
var __F352Session=__createF352Session(__F352Recipe,{read:key=>localStorage.getItem(key),write:(key,value)=>localStorage.setItem(key,value)});
// Migration seam for F3.51 experiment files; there is no second state store.
var __F351Combination=__F352Session;