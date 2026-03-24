let timeoutId: number | undefined;

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  return ((...args: unknown[]) => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, ms);
  }) as T;
}

export function cancelDebounce(): void {
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    timeoutId = undefined;
  }
}