"use client";

import { useCallback, useEffect, useState } from "react";

export function useChainState<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [record, setRecord] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then((value) => {
      if (!controller.signal.aborted) setRecord(value);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not read Stellar Testnet.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load, attempt]);

  return { record, error, loading, refresh };
}
