import { SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET, type SpectralForgeEntryScrollIntent } from '../contracts/spectralForgeEntryIntent';

export type SpectralForgeEntryScrollOutcome = {
  ok: boolean;
  reason: SpectralForgeEntryScrollIntent['reason'] | 'manual';
  token: string;
  targetFound: boolean;
  rootFound: boolean;
  scrollerKind: 'spectral-root' | 'scrollable-parent' | 'window' | 'none';
  targetTopInWindow: number | null;
  targetTopInScroller: number | null;
  scrollerScrollTop: number | null;
  scrollTopBefore: number | null;
  scrollTopAfter: number | null;
  targetTopInWindowBefore: number | null;
  targetTopInWindowAfter: number | null;
  targetTopInScrollerBefore: number | null;
  targetTopInScrollerAfter: number | null;
  visibleRatio: number | null;
  scrollerTag: string | null;
  scrollerOverflowY: string | null;
  scrollerScrollHeight: number | null;
  scrollerClientHeight: number | null;
};

export type SpectralForgeEntryScrollDiagnosticPhase =
  | 'intent-seen'
  | 'intent-pending'
  | 'intent-scheduled'
  | 'load-started'
  | 'load-finished'
  | 'load-cancelled'
  | 'external-load-consumed'
  | 'scroll-attempt'
  | 'scroll-layer-snapshot'
  | 'target-missing'
  | 'target-found'
  | 'scroll-applied'
  | 'intent-consumed'
  | 'intent-still-pending'
  | 'cleanup';

export type SpectralForgeEntryScrollDiagnosticEntry = {
  ts: number;
  phase: SpectralForgeEntryScrollDiagnosticPhase;
  reason?: SpectralForgeEntryScrollIntent['reason'] | 'manual';
  target?: SpectralForgeEntryScrollIntent['target'];
  token?: string;
  ok?: boolean;
  attempt?: number;
  fileSignature?: string;
  sourceReady?: boolean;
  targetFound?: boolean;
  rootFound?: boolean;
  scrollerKind?: SpectralForgeEntryScrollOutcome['scrollerKind'];
  scrollerTag?: string | null;
  scrollerOverflowY?: string | null;
  scrollerScrollHeight?: number | null;
  scrollerClientHeight?: number | null;
  scrollTopBefore?: number | null;
  scrollTopAfter?: number | null;
  targetTopInWindowBefore?: number | null;
  targetTopInWindowAfter?: number | null;
  targetTopInScrollerBefore?: number | null;
  targetTopInScrollerAfter?: number | null;
  visibleRatio?: number | null;
  note?: string;
};

export type SpectralForgeEntryScrollDiagnosticState = {
  version: '3.2.91.5.20';
  lastOutcome: SpectralForgeEntryScrollOutcome | null;
  events: SpectralForgeEntryScrollDiagnosticEntry[];
  latestByToken: Record<string, SpectralForgeEntryScrollDiagnosticEntry>;
};

export type XensonarScrollLayerCandidate = {
  label: string;
  tag: string;
  marker: string | null;
  overflowY: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  canScroll: boolean;
  rectTop: number | null;
  rectBottom: number | null;
};

export type XensonarScrollLayerDiagnosticState = {
  version: '3.2.91.5.20';
  ts: number;
  reason: SpectralForgeEntryScrollIntent['reason'] | 'manual';
  token: string;
  document: {
    windowScrollY: number;
    documentScrollHeight: number;
    documentClientHeight: number;
    htmlOverflowY: string;
    bodyOverflowY: string;
    bodySpectralForgeActive: boolean;
    documentCanScroll: boolean;
  };
  counts: {
    spectralRoots: number;
    materialIntakeTargets: number;
    cutUploadTargets: number;
  };
  selectedScroller: {
    kind: SpectralForgeEntryScrollOutcome['scrollerKind'];
    tag: string | null;
  } | null;
  candidates: XensonarScrollLayerCandidate[];
};

type ScrollOptions = {
  reason?: SpectralForgeEntryScrollIntent['reason'] | 'manual';
  token?: string;
  behavior?: ScrollBehavior;
  viewportOffsetPx?: number;
  attempt?: number;
};

type ScrollContainer = {
  element: HTMLElement | null;
  kind: SpectralForgeEntryScrollOutcome['scrollerKind'];
};

declare global {
  interface Window {
    __xensonarSpectralForgeEntryScrollDiag?: SpectralForgeEntryScrollDiagnosticState;
    __xensonarScrollLayerDiag?: XensonarScrollLayerDiagnosticState;
  }
}

const TARGET_SELECTOR = '[data-cut-upload-entry-target="true"], [data-material-intake-gateway="true"]';
const ROOT_SELECTOR = '[data-spectralforge-scroll-root="true"]';
const MAX_DIAGNOSTIC_EVENTS = 80;
const SCROLL_LAYER_CANDIDATE_SELECTOR = '[data-spectralforge-scroll-root="true"], [data-wheel-allow-scroll="true"], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll';

function getElementMarker(element: HTMLElement) {
  if (element.getAttribute('data-spectralforge-scroll-root') === 'true') return 'spectral-root';
  const island = element.getAttribute('data-xensonar-scroll-island');
  if (island) return 'scroll-island:' + island;
  if (element.getAttribute('data-wheel-allow-scroll') === 'true') return 'wheel-allow-scroll';
  return null;
}

function describeElement(element: HTMLElement) {
  const marker = getElementMarker(element);
  const id = element.id ? '#' + element.id : '';
  const className = typeof element.className === 'string' && element.className.trim()
    ? '.' + element.className.trim().split(/\s+/).slice(0, 3).join('.')
    : '';
  return element.tagName.toLowerCase() + id + className + (marker ? '[' + marker + ']' : '');
}

function createScrollLayerCandidate(label: string, element: HTMLElement): XensonarScrollLayerCandidate {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const canScroll = element.scrollHeight > element.clientHeight + 2;
  return {
    label,
    tag: describeElement(element),
    marker: getElementMarker(element),
    overflowY: style.overflowY,
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    canScroll,
    rectTop: Number.isFinite(rect.top) ? Math.round(rect.top) : null,
    rectBottom: Number.isFinite(rect.bottom) ? Math.round(rect.bottom) : null,
  };
}

function getDiagnosticState(): SpectralForgeEntryScrollDiagnosticState {
  const existing = window.__xensonarSpectralForgeEntryScrollDiag;
  if (existing?.version === '3.2.91.5.20' && Array.isArray(existing.events)) return existing;
  const next: SpectralForgeEntryScrollDiagnosticState = {
    version: '3.2.91.5.20',
    lastOutcome: null,
    events: [],
    latestByToken: {},
  };
  window.__xensonarSpectralForgeEntryScrollDiag = next;
  return next;
}

export function recordSpectralForgeEntryScrollDiagnostic(entry: Omit<SpectralForgeEntryScrollDiagnosticEntry, 'ts'> & { ts?: number }) {
  try {
    const state = getDiagnosticState();
    const event: SpectralForgeEntryScrollDiagnosticEntry = {
      ts: entry.ts ?? Math.round(performance.now()),
      ...entry,
    };
    state.events.push(event);
    if (state.events.length > MAX_DIAGNOSTIC_EVENTS) state.events.splice(0, state.events.length - MAX_DIAGNOSTIC_EVENTS);
    if (event.token) state.latestByToken[event.token] = event;
  } catch {
    // Internal diagnostic only; never block user interaction.
  }
}

function isScrollableElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const allowsScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  return allowsScroll && element.scrollHeight > element.clientHeight + 2;
}

function findScrollableParent(target: HTMLElement, root: HTMLElement | null): ScrollContainer {
  if (root && isScrollableElement(root)) return { element: root, kind: 'spectral-root' };

  let current = target.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollableElement(current)) {
      return { element: current, kind: current === root ? 'spectral-root' : 'scrollable-parent' };
    }
    current = current.parentElement;
  }

  if (root) return { element: root, kind: 'spectral-root' };
  return { element: null, kind: 'window' };
}

function getScrollerScrollTop(container: ScrollContainer) {
  return container.element?.scrollTop ?? document.scrollingElement?.scrollTop ?? window.scrollY;
}

function getScrollerOverflowY(container: ScrollContainer) {
  return container.element ? window.getComputedStyle(container.element).overflowY : 'window';
}

function getScrollerTag(container: ScrollContainer) {
  if (!container.element) return 'window';
  const marker = container.element.getAttribute('data-spectralforge-scroll-root') === 'true' ? '[data-spectralforge-scroll-root]' : '';
  return `${container.element.tagName.toLowerCase()}${marker}`;
}

function getRelativeTargetTop(targetRect: DOMRect, container: ScrollContainer) {
  const containerRect = container.element?.getBoundingClientRect() ?? null;
  return containerRect ? targetRect.top - containerRect.top : targetRect.top;
}

function computeVisibleRatio(target: HTMLElement, container: ScrollContainer) {
  const targetRect = target.getBoundingClientRect();
  const viewportRect = container.element?.getBoundingClientRect() ?? {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const visibleTop = Math.max(targetRect.top, viewportRect.top);
  const visibleBottom = Math.min(targetRect.bottom, viewportRect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return Math.max(0, Math.min(1, visibleHeight / Math.max(1, targetRect.height)));
}

function isVisibleNearTop(target: HTMLElement, container: ScrollContainer, offset: number) {
  const targetRect = target.getBoundingClientRect();
  const visibleRatio = computeVisibleRatio(target, container);
  if (!container.element) {
    return visibleRatio > 0.64 && targetRect.top >= offset - 2 && targetRect.top <= Math.max(offset + 90, window.innerHeight * 0.35);
  }

  const containerRect = container.element.getBoundingClientRect();
  const relativeTop = targetRect.top - containerRect.top;
  return visibleRatio > 0.64 && relativeTop >= offset - 2 && relativeTop <= Math.max(offset + 90, containerRect.height * 0.35);
}

export function collectSpectralForgeScrollLayerDiagnostics(options: {
  reason?: SpectralForgeEntryScrollIntent['reason'] | 'manual';
  token?: string;
  selectedScroller?: ScrollContainer | null;
} = {}): XensonarScrollLayerDiagnosticState | null {
  try {
    const html = document.documentElement;
    const body = document.body;
    const htmlStyle = window.getComputedStyle(html);
    const bodyStyle = window.getComputedStyle(body);
    const seen = new Set<HTMLElement>();
    const candidates: XensonarScrollLayerCandidate[] = [];

    const addCandidate = (label: string, element: HTMLElement | null | undefined) => {
      if (!element || seen.has(element)) return;
      seen.add(element);
      candidates.push(createScrollLayerCandidate(label, element));
    };

    addCandidate('html', html);
    addCandidate('body', body);
    document.querySelectorAll<HTMLElement>(SCROLL_LAYER_CANDIDATE_SELECTOR).forEach((element, index) => {
      addCandidate('candidate:' + index, element);
    });

    const state: XensonarScrollLayerDiagnosticState = {
      version: '3.2.91.5.20',
      ts: Math.round(performance.now()),
      reason: options.reason ?? 'manual',
      token: options.token ?? 'manual',
      document: {
        windowScrollY: Math.round(window.scrollY),
        documentScrollHeight: document.scrollingElement?.scrollHeight ?? html.scrollHeight,
        documentClientHeight: document.scrollingElement?.clientHeight ?? html.clientHeight,
        htmlOverflowY: htmlStyle.overflowY,
        bodyOverflowY: bodyStyle.overflowY,
        bodySpectralForgeActive: body.getAttribute('data-xensonar-spectralforge-active') === 'true',
        documentCanScroll: (document.scrollingElement?.scrollHeight ?? html.scrollHeight) > (document.scrollingElement?.clientHeight ?? html.clientHeight) + 2,
      },
      counts: {
        spectralRoots: document.querySelectorAll(ROOT_SELECTOR).length,
        materialIntakeTargets: document.querySelectorAll('[data-material-intake-gateway="true"]').length,
        cutUploadTargets: document.querySelectorAll('[data-cut-upload-entry-target="true"]').length,
      },
      selectedScroller: options.selectedScroller ? {
        kind: options.selectedScroller.kind,
        tag: getScrollerTag(options.selectedScroller),
      } : null,
      candidates,
    };
    window.__xensonarScrollLayerDiag = state;
    return state;
  } catch {
    return null;
  }
}

function writeDiagnostic(outcome: SpectralForgeEntryScrollOutcome) {
  try {
    const state = getDiagnosticState();
    state.lastOutcome = outcome;
  } catch {
    // Internal diagnostic only; never block user interaction.
  }
}

export function scrollSpectralForgeToIntakeGateway(options: ScrollOptions = {}): SpectralForgeEntryScrollOutcome {
  const reason = options.reason ?? 'manual';
  const token = options.token ?? 'manual';
  const behavior = options.behavior ?? 'auto';
  const offset = options.viewportOffsetPx ?? 8;
  const target = document.querySelector<HTMLElement>(TARGET_SELECTOR);
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);

  if (!target) {
    const outcome: SpectralForgeEntryScrollOutcome = {
      ok: false,
      reason,
      token,
      targetFound: false,
      rootFound: !!root,
      scrollerKind: root ? 'spectral-root' : 'none',
      targetTopInWindow: null,
      targetTopInScroller: null,
      scrollerScrollTop: root?.scrollTop ?? null,
      scrollTopBefore: root?.scrollTop ?? null,
      scrollTopAfter: root?.scrollTop ?? null,
      targetTopInWindowBefore: null,
      targetTopInWindowAfter: null,
      targetTopInScrollerBefore: null,
      targetTopInScrollerAfter: null,
      visibleRatio: null,
      scrollerTag: root ? 'div[data-spectralforge-scroll-root]' : null,
      scrollerOverflowY: root ? window.getComputedStyle(root).overflowY : null,
      scrollerScrollHeight: root?.scrollHeight ?? null,
      scrollerClientHeight: root?.clientHeight ?? null,
    };
    writeDiagnostic(outcome);
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'target-missing',
      reason,
      target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
      token,
      ok: false,
      attempt: options.attempt,
      targetFound: false,
      rootFound: !!root,
      scrollerKind: outcome.scrollerKind,
      scrollerTag: outcome.scrollerTag,
      scrollerOverflowY: outcome.scrollerOverflowY,
      scrollerScrollHeight: outcome.scrollerScrollHeight,
      scrollerClientHeight: outcome.scrollerClientHeight,
      note: 'scroll helper could not find the material intake gateway target',
    });
    return outcome;
  }

  const scrollRoot = (target.closest(ROOT_SELECTOR) as HTMLElement | null) ?? root;
  const container = findScrollableParent(target, scrollRoot);
  const layerDiag = collectSpectralForgeScrollLayerDiagnostics({ reason, token, selectedScroller: container });
  if (layerDiag) {
    const activeScrollableCandidates = layerDiag.candidates.filter((candidate) => candidate.canScroll).length;
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'scroll-layer-snapshot',
      reason,
      target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
      token,
      attempt: options.attempt,
      rootFound: !!scrollRoot,
      scrollerKind: container.kind,
      scrollerTag: getScrollerTag(container),
      scrollerOverflowY: getScrollerOverflowY(container),
      note: 'scroll-layer snapshot: documentCanScroll=' + layerDiag.document.documentCanScroll + ', bodySpectralForgeActive=' + layerDiag.document.bodySpectralForgeActive + ', scrollableCandidates=' + activeScrollableCandidates + ', spectralRoots=' + layerDiag.counts.spectralRoots,
    });
  }
  const beforeTargetRect = target.getBoundingClientRect();
  const beforeRelativeTop = getRelativeTargetTop(beforeTargetRect, container);
  const scrollTopBefore = getScrollerScrollTop(container);

  recordSpectralForgeEntryScrollDiagnostic({
    phase: 'target-found',
    reason,
    target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
    token,
    attempt: options.attempt,
    targetFound: true,
    rootFound: !!scrollRoot,
    scrollerKind: container.kind,
    scrollerTag: getScrollerTag(container),
    scrollerOverflowY: getScrollerOverflowY(container),
    scrollerScrollHeight: container.element?.scrollHeight ?? document.scrollingElement?.scrollHeight ?? null,
    scrollerClientHeight: container.element?.clientHeight ?? document.scrollingElement?.clientHeight ?? null,
    scrollTopBefore,
    targetTopInWindowBefore: beforeTargetRect.top,
    targetTopInScrollerBefore: beforeRelativeTop,
  });

  if (container.element) {
    const containerRect = container.element.getBoundingClientRect();
    const nextTop = container.element.scrollTop + beforeTargetRect.top - containerRect.top - offset;
    container.element.scrollTo({ top: Math.max(0, nextTop), behavior });
  } else {
    window.scrollTo({ top: Math.max(0, window.scrollY + beforeTargetRect.top - offset), behavior });
  }

  const afterContainerScrollRect = target.getBoundingClientRect();
  if (afterContainerScrollRect.top < offset || afterContainerScrollRect.top > window.innerHeight * 0.72) {
    window.scrollTo({ top: Math.max(0, window.scrollY + afterContainerScrollRect.top - offset), behavior });
  }

  const finalTargetRect = target.getBoundingClientRect();
  const finalScrollerRect = container.element?.getBoundingClientRect() ?? null;
  const visibleRatio = computeVisibleRatio(target, container);
  const outcome: SpectralForgeEntryScrollOutcome = {
    ok: isVisibleNearTop(target, container, offset),
    reason,
    token,
    targetFound: true,
    rootFound: !!scrollRoot,
    scrollerKind: container.kind,
    targetTopInWindow: finalTargetRect.top,
    targetTopInScroller: finalScrollerRect ? finalTargetRect.top - finalScrollerRect.top : finalTargetRect.top,
    scrollerScrollTop: getScrollerScrollTop(container),
    scrollTopBefore,
    scrollTopAfter: getScrollerScrollTop(container),
    targetTopInWindowBefore: beforeTargetRect.top,
    targetTopInWindowAfter: finalTargetRect.top,
    targetTopInScrollerBefore: beforeRelativeTop,
    targetTopInScrollerAfter: finalScrollerRect ? finalTargetRect.top - finalScrollerRect.top : finalTargetRect.top,
    visibleRatio,
    scrollerTag: getScrollerTag(container),
    scrollerOverflowY: getScrollerOverflowY(container),
    scrollerScrollHeight: container.element?.scrollHeight ?? document.scrollingElement?.scrollHeight ?? null,
    scrollerClientHeight: container.element?.clientHeight ?? document.scrollingElement?.clientHeight ?? null,
  };
  writeDiagnostic(outcome);
  recordSpectralForgeEntryScrollDiagnostic({
    phase: 'scroll-attempt',
    reason,
    target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
    token,
    ok: outcome.ok,
    attempt: options.attempt,
    targetFound: outcome.targetFound,
    rootFound: outcome.rootFound,
    scrollerKind: outcome.scrollerKind,
    scrollerTag: outcome.scrollerTag,
    scrollerOverflowY: outcome.scrollerOverflowY,
    scrollerScrollHeight: outcome.scrollerScrollHeight,
    scrollerClientHeight: outcome.scrollerClientHeight,
    scrollTopBefore: outcome.scrollTopBefore,
    scrollTopAfter: outcome.scrollTopAfter,
    targetTopInWindowBefore: outcome.targetTopInWindowBefore,
    targetTopInWindowAfter: outcome.targetTopInWindowAfter,
    targetTopInScrollerBefore: outcome.targetTopInScrollerBefore,
    targetTopInScrollerAfter: outcome.targetTopInScrollerAfter,
    visibleRatio: outcome.visibleRatio,
  });
  if (outcome.ok) {
    recordSpectralForgeEntryScrollDiagnostic({
      phase: 'scroll-applied',
      reason,
      target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
      token,
      ok: true,
      attempt: options.attempt,
      visibleRatio,
      scrollTopAfter: outcome.scrollTopAfter,
      targetTopInWindowAfter: outcome.targetTopInWindowAfter,
      targetTopInScrollerAfter: outcome.targetTopInScrollerAfter,
    });
  }
  return outcome;
}
