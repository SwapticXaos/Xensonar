import { useCallback, useEffect, useRef, useState } from 'react';

export type MaterialIntakeActionFeedbackKey = string;
export type MaterialIntakeActionFeedbackAction = () => boolean | Promise<boolean>;

export interface MaterialIntakeActionFeedbackState {
  pendingMap: Record<MaterialIntakeActionFeedbackKey, boolean>;
  successMap: Record<MaterialIntakeActionFeedbackKey, boolean>;
  flashSuccess: (key: MaterialIntakeActionFeedbackKey) => void;
  runActionWithFeedback: (
    key: MaterialIntakeActionFeedbackKey,
    action: MaterialIntakeActionFeedbackAction,
  ) => Promise<boolean>;
}

const DEFAULT_SUCCESS_FLASH_MS = 1200;

export function useMaterialIntakeActionFeedback(
  successFlashMs: number = DEFAULT_SUCCESS_FLASH_MS,
): MaterialIntakeActionFeedbackState {
  const successTimeoutsRef = useRef<Record<MaterialIntakeActionFeedbackKey, number>>({});
  const [pendingMap, setPendingMap] = useState<Record<MaterialIntakeActionFeedbackKey, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<MaterialIntakeActionFeedbackKey, boolean>>({});

  useEffect(() => () => {
    Object.values(successTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    successTimeoutsRef.current = {};
  }, []);

  const flashSuccess = useCallback((key: MaterialIntakeActionFeedbackKey) => {
    if (successTimeoutsRef.current[key]) window.clearTimeout(successTimeoutsRef.current[key]);
    setSuccessMap((current) => ({ ...current, [key]: true }));
    successTimeoutsRef.current[key] = window.setTimeout(() => {
      setSuccessMap((current) => ({ ...current, [key]: false }));
      delete successTimeoutsRef.current[key];
    }, successFlashMs);
  }, [successFlashMs]);

  const runActionWithFeedback = useCallback(async (
    key: MaterialIntakeActionFeedbackKey,
    action: MaterialIntakeActionFeedbackAction,
  ) => {
    setPendingMap((current) => ({ ...current, [key]: true }));
    try {
      const ok = await action();
      if (ok) flashSuccess(key);
      return ok;
    } finally {
      setPendingMap((current) => ({ ...current, [key]: false }));
    }
  }, [flashSuccess]);

  return {
    pendingMap,
    successMap,
    flashSuccess,
    runActionWithFeedback,
  };
}
