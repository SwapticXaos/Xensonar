'use strict';
require('./forge-spatial-preservation.cjs');
const fs=require('fs'),crypto=require('crypto'),base=require('../docs/forge-spatial/baseline.json');
module.exports={anchors:Object.fromEntries(Object.keys(base.contracts).map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))};
