import fs from 'node:fs';
import path from 'node:path';

export const root = process.cwd();

export const resolveRepoPath = (rel) => path.join(root, rel);

export function createCheck(name) {
  const failures = [];
  const read = (rel) => fs.readFileSync(resolveRepoPath(rel), 'utf8');
  const exists = (rel) => fs.existsSync(resolveRepoPath(rel));
  const readIfExists = (rel, fallback = '') => (exists(rel) ? read(rel) : fallback);
  const readJsonIfExists = (rel, fallback = {}) => {
    if (!exists(rel)) return fallback;
    return JSON.parse(read(rel));
  };
  const requireCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const requireFile = (rel) => requireCondition(exists(rel), `missing ${rel}`);
  const requireText = (label, haystack, needle, message = `${label} missing ${needle}`) => {
    if (!haystack.includes(needle)) failures.push(message);
  };
  const forbidText = (label, haystack, needle, message = `${label} must not contain ${needle}`) => {
    if (haystack.includes(needle)) failures.push(message);
  };
  const requireRegex = (label, haystack, regex, message = `${label} missing ${regex}`) => {
    if (!regex.test(haystack)) failures.push(message);
  };
  const finish = (report = {}) => {
    const output = {
      ...report,
      ok: failures.length === 0,
      failures,
    };
    const text = JSON.stringify(output, null, 2);
    if (failures.length) {
      console.error(`[${name}] failed`);
      console.error(text);
      process.exit(1);
    }
    console.log(`[${name}] ok`);
    console.log(text);
  };

  return {
    name,
    failures,
    read,
    exists,
    readIfExists,
    readJsonIfExists,
    require: requireCondition,
    requireFile,
    requireText,
    forbidText,
    requireRegex,
    finish,
  };
}
