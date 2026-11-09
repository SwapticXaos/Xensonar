export const BROWSER_SAFE_FILE_INPUT_CLASSNAME = 'fixed left-[-10000px] top-0 h-px w-px opacity-0';

export function clickBrowserSafeFileInput(input: HTMLInputElement | null) {
  if (!input) return false;
  input.click();
  return true;
}
