export function mergeNestedUiSection<T extends Record<string, unknown>, K extends keyof T>(
  prev: T,
  key: K,
  partial: Partial<T[K]>,
): T {
  return {
    ...prev,
    [key]: {
      ...(prev[key] as object),
      ...(partial as object),
    },
  } as T;
}
