'use strict';
require('./history-sharing-preservation.cjs');
const supplied=require('../docs/shared-history/baseline.json').hashes,prior=require('../docs/consolidation/baseline.json').hashes;
module.exports={anchors:{...Object.fromEntries(Object.entries(supplied).filter(([f,h])=>prior[f]!==h)),...require('../docs/shared-history/source-anchors.json'),...require('./forge-spatial-compat.cjs').anchors},additions:['src/storage/07_history_snapshots.js']};
