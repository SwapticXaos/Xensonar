'use strict';
// Historical release checks keep their original baselines. The current patch
// additionally proves that only the named integration functions changed.
require('./consolidation-preservation.cjs');
const current=require('./history-sharing-compat.cjs');
module.exports={anchors:{...require('../docs/consolidation/source-anchors.json'),...current.anchors},additions:['src/handoff/00_chat_feature_addons.js','src/storage/05_project_snapshots.js','src/storage/06_history_budget.js',...current.additions.filter(f=>f!=='src/handoff/00_chat_feature_addons.js')]};
