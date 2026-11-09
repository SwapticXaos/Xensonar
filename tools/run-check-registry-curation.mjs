#!/usr/bin/env node
import process from 'node:process';
import { buildCheckRegistryCurationReport, writeCheckRegistryCurationReports, checkRegistryCurationPaths } from './check-registry-curation-core.mjs';

const report = buildCheckRegistryCurationReport(process.cwd());
writeCheckRegistryCurationReports(process.cwd(), report);
console.log(JSON.stringify({
  ok: report.ok,
  report: checkRegistryCurationPaths.json,
  markdown: checkRegistryCurationPaths.markdown,
  totalCheckScripts: report.summary.totalCheckScripts,
  primaryProofClassHistogram: report.summary.primaryProofClassHistogram,
  warnings: report.warnings.length,
}, null, 2));
process.exit(report.ok ? 0 : 1);
