"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminApiError } from "@/lib/admin";

/**
 * One fetch, its loading flag, its error, and a way to run it again.
 *
 * Every CMS screen needs exactly this and nothing more, so it is worth the
 * twenty lines rather than a data library. Two details matter:
 *
 *   - results from a superseded call are dropped, so a fast second request
 *     cannot be overwritten by a slow first one (type into a search box quickly
 *     and this is the difference between right and wrong results);
 *   - state is not written after unmount.
 */
export function useAsync<T>(
  run: () => Promise<T>,
  deps: unknown[]
): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (next: T) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  /** Incremented per call; a response whose ticket is stale is discarded. */
  const ticket = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const mine = (ticket.current += 1);
    setLoading(true);
    setError(null);

    runRef
      .current()
      .then((result) => {
        if (!alive.current || ticket.current !== mine) return;
        setData(result);
      })
      .catch((cause: unknown) => {
        if (!alive.current || ticket.current !== mine) return;
        setError(
          cause instanceof AdminApiError
            ? cause.message
            : "Something went wrong loading this. Please try again."
        );
      })
      .finally(() => {
        if (!alive.current || ticket.current !== mine) return;
        setLoading(false);
      });
    // `run` is held in a ref so an inline closure does not re-fire the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, error, loading, reload, setData };
}

/** Debounced mirror of a value — for search boxes that hit the API. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
