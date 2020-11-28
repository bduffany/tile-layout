import { useState, useEffect } from 'react';

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
export default function useAsync<T, E = any>(
  asyncFunction: (() => Promise<T>) | null
) {
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
