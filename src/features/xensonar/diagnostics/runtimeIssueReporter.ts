export type XensonarRuntimeIssueSeverity = 'info' | 'warning' | 'error';

export type XensonarRuntimeIssueDomain =
  | 'audio'
  | 'samples'
  | 'material'
  | 'root-follow'
  | 'spectralforge'
  | 'topology'
  | 'runtime';

export type XensonarRuntimeIssue = {
  domain: XensonarRuntimeIssueDomain;
  code: string;
  severity?: XensonarRuntimeIssueSeverity;
  message?: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

export const XENSONAR_RUNTIME_ISSUE_EVENT = 'xensonar-runtime-issue';

function describeRuntimeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function reportXensonarRuntimeIssue(issue: XensonarRuntimeIssue) {
  const severity = issue.severity ?? 'error';
  const message = issue.message ?? describeRuntimeError(issue.error);
  const payload = {
    ...issue,
    severity,
    message,
    timestamp: Date.now(),
  };

  const log = severity === 'info' ? console.info : severity === 'warning' ? console.warn : console.error;
  log(`[xensonar][${issue.domain}][${issue.code}] ${message}`, {
    error: issue.error,
    context: issue.context,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(XENSONAR_RUNTIME_ISSUE_EVENT, { detail: payload }));
  }
}

export function reportXensonarPromiseFailure(
  domain: XensonarRuntimeIssueDomain,
  code: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  reportXensonarRuntimeIssue({ domain, code, error, context, severity: 'error' });
}
