import { useCallback, useRef } from 'react';

/**
 * useDebounce — returns a debounced version of the callback.
 * @param fn - function to debounce
 * @param delay - debounce delay in ms
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay],
  );
};
