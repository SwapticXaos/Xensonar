import { TONE_PLAN_BYTES, TONE_PLAN_KIND, TONE_PLAN_WORDS, validateTonePlanRecord } from "./tonePlanRecord";
import { ENTROPHON_PLAN_KIND, validateEntrophonPlanRecord } from "./entrophonVoiceRecord";

export const BROWSER_C11_RECORD_WORDS = TONE_PLAN_WORDS;
export const BROWSER_C11_RECORD_BYTES = TONE_PLAN_BYTES;

export function validateBrowserC11Record(words: Uint32Array): boolean {
  if (words.length !== BROWSER_C11_RECORD_WORDS) return false;
  const kind = words[0] & 0xff;
  if (kind === TONE_PLAN_KIND) return validateTonePlanRecord(words);
  if (kind === ENTROPHON_PLAN_KIND) return validateEntrophonPlanRecord(words);
  return false;
}
