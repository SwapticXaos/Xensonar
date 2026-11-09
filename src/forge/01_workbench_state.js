// Stable public facade; recipes, material selection and state each have one owner.
const __F341Recipe=__createF341Recipe(__F341PresetCatalog,__F354SustainScout.normalize);
const __F341MaterialSelection=__createF341MaterialSelection(__F341Recipe.clamp,(model,cfg)=>__F356Material.allowedModel(model,cfg));
var __F341Workbench=__createF341WorkbenchStore({recipe:__F341Recipe,selection:__F341MaterialSelection,restoreSound:__f341RestoreSound,soundSettings:__f341SoundSettings,emitChange:()=>{if(typeof window!=="undefined")window.dispatchEvent(new Event("xensonar:donor-workbench-changed"));}});
