import { useState, useEffect, useMemo, useCallback, Dispatch } from 'react';

/**
 * Hook that invokes the given async function (if not already invoked) and
 * returns the state of its returned promise.
 *
 * @param asyncFunction
 * @return \{
 *   pending: whether the promise is still pending.
 *   value: the resolved value if the promise resolved, otherwise null.
 *   error: the rejected value if the promise rejected, otherwise null.
 * }
 */
export function useAsync<T, E = any>(asyncFunction: (() => Promise<T>) | null) {
  const [pending, setPending] = useState(false);
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  useEffect(() => {
    setValue(null);
    setError(null);

    if (!asyncFunction) {
      setPending(false);
      return;
    }

    setPending(true);
    let cancelled = false;

    (async () => {
      try {
        const value = await asyncFunction();
        if (!cancelled) setValue(value);
      } catch (error) {
        if (!cancelled) setError(error);
      } finally {
        if (!cancelled) setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asyncFunction]);

  return { pending, value, error };
}

/**
 * Performs a fetch call if the input is non-null and returns
 * an object with the state of the promise returned by the
 * fetch call.
 *
 * @param input
 * @param init
 */
export function useFetch(input: RequestInfo, init?: RequestInit | undefined) {
  const doFetch = useMemo(() => {
    if (!input) return null;

    return async () => {
      const response = await fetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      const data =
        contentType === 'application/json' ||
        contentType.startsWith('application/json;')
          ? response.json()
          : response.text();

      return data;
    };
  }, [input, init]);

  const { pending, value, error } = useAsync(doFetch);

  return { loading: pending, data: value, error: error };
}

export function useLocalStorage(
  key: string,
  initialValue?: string
): [string | undefined, Dispatch<string>] {
  const [value, setValue] = useState(() => {
    if (key in window.localStorage) return window.localStorage[key];
    if (initialValue === undefined) return undefined;
    return (window.localStorage[key] = initialValue);
  });

  const setItem = useMemo(
    () => (newValue: string) => {
      setValue(newValue);
      window.localStorage.setItem(key, newValue);
    },
    [key]
  );

  const handleStorage = useCallback(
    (event: StorageEvent) => {
      if (event.key === key) setValue(localStorage[key]);
    },
    [key]
  );

  useEffect(() => {
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [handleStorage]);

  return [value, setItem];
}
