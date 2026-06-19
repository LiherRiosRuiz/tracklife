"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type UseApiDataOptions = {
  enabled?: boolean;
};

type UseApiDataReturn<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiDataOptions = {},
): UseApiDataReturn<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const execute = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const currentFetch = ++fetchCountRef.current;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (currentFetch !== fetchCountRef.current) return;
        setData(result);
      })
      .catch((e: unknown) => {
        if (currentFetch !== fetchCountRef.current) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
      })
      .finally(() => {
        if (currentFetch !== fetchCountRef.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
