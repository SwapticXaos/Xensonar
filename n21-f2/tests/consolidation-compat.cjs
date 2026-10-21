'use strict';
// P7.24 proves the complete source order independently; retain this exact
// historical addition set in that guarded order, including the new Song unit.
// Historical release checks keep their original baselines. The current patch
// additionally proves that only the named integration functions changed.
require('./consolidation-preservation.cjs');
const current=require('./history-sharing-compat.cjs');
module.exports={anchors:{...require('../docs/consolidation/source-anchors.json'),...current.anchors},additions:['src/handoff/00_chat_feature_addons.js','src/storage/05_project_snapshots.js','src/storage/06_history_budget.js',...current.additions.filter(f=>f!=='src/handoff/00_chat_feature_addons.js')].sort((a,b)=>require('../source-manifest.json').files.indexOf(a)-require('../source-manifest.json').files.indexOf(b))};
