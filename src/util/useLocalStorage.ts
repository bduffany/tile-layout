import { Dispatch, useCallback, useEffect, useMemo, useState } from 'react';

export default function useLocalStorage(
  key: string,
  initialValue: string = ''
): [string, Dispatch<string>] {
  const [value, setValue] = useState(
    () => window.localStorage.getItem(key) || initialValue
  );

  const setItem = useMemo(
    () => (newValue: string) => {
      setValue(newValue);
      window.localStorage.setItem(key, newValue);
    },
    [key]
  );

  useEffect(() => {
    const newValue = window.localStorage.getItem(key);
    if (value !== newValue) {
      setValue(newValue || initialValue);
    }
  }, [key, value, initialValue]);

  const handleStorage = useCallback(
    (event: StorageEvent) => {
      if (event.key === key && event.newValue !== value) {
        setValue(event.newValue || initialValue);
      }
    },
    [initialValue, key, value]
  );

  useEffect(() => {
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [handleStorage]);

  return [value, setItem];
}

export function useJsonLocalStorage<T>(
  key: string,
  initialValue: string
): [T, (value: T) => void] {
  const [value, setItem] = useLocalStorage(key, initialValue);
  const setJsonValue = useMemo(
    () => (value: T) => {
      setItem(JSON.stringify(value));
    },
    /* eslint-disable */
    [setItem]
  );
  const parsed = useMemo(() => JSON.parse(value), [value]);

  return [parsed, setJsonValue];
}
