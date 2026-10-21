'use strict';
// P7.24 proves the complete source order independently; retain this exact
// historical addition set in that guarded order, including the new Song unit.
require('./history-sharing-preservation.cjs');
const supplied=require('../docs/shared-history/baseline.json').hashes,prior=require('../docs/consolidation/baseline.json').hashes;
module.exports={anchors:{...Object.fromEntries(Object.entries(supplied).filter(([f,h])=>prior[f]!==h)),...require('../docs/shared-history/source-anchors.json'),...require('./forge-spatial-compat.cjs').anchors},additions:['src/handoff/00_chat_feature_addons.js','src/storage/07_history_snapshots.js',...require('./forge-spatial-compat.cjs').additions.filter(f=>f!=='src/handoff/00_chat_feature_addons.js')].sort((a,b)=>require('../source-manifest.json').files.indexOf(a)-require('../source-manifest.json').files.indexOf(b))};
