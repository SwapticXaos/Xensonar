export function resolveSingleHtmlMount(id: string): HTMLElement {
  const selector = `#${id}`;
  const mounts = Array.from(document.querySelectorAll<HTMLElement>(selector));

  if (mounts.length === 1) {
    return mounts[0];
  }

  if (mounts.length === 0) {
    throw new Error(`Xensonar start failed: missing HTML mount node <div id="${id}"></div>.`);
  }

  throw new Error(`Xensonar start failed: expected exactly one ${selector} element, found ${mounts.length}.`);
}
