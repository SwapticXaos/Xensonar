'use strict';
require('./nodal-ball-grid-preservation.cjs');
const fs=require('fs'),crypto=require('crypto'),base=require('../docs/nodal-ball-grid/baseline.json');
const current=require('./p7-review-preservation.cjs');
module.exports={anchors:{...current.anchors,...Object.fromEntries(Object.keys(base.contracts).map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))},additions:current.additions};
