"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toErrorMessage } from "@/lib/api-error";

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
        // Raw e.message leaks api.ts's res.statusText fallback — a non-JSON 500
        // rendered the English "Internal Server Error" into a Spanish UI on every
        // page using this hook. toErrorMessage keeps API text only for 4xx, and
        // returns null on 401 so no red flash precedes the /login redirect.
        setError(toErrorMessage(e, "Error al cargar los datos"));
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
