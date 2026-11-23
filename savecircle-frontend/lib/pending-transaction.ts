"use client";

import { useState } from "react";
import { apiBaseUrl } from "./api";

export function usePendingTransaction(scope: string) {
  const key = `savecircle:transaction:${apiBaseUrl}:${scope}`;
  const [hash, setHash] = useState(() => {
    try {
      const value = localStorage.getItem(key);
      return value && /^[a-f0-9]{64}$/i.test(value) ? value : "";
    }
    catch { return ""; }
  });
  return {
    hash,
    save(next: string) {
      setHash(next);
      try {
        if (next) localStorage.setItem(key, next);
        else localStorage.removeItem(key);
      } catch {
        // Keep the transaction reference in memory when browser storage is unavailable.
      }
    },
  };
}
