"use client";

import { useMemo, useSyncExternalStore } from "react";

export type WalletSession = { walletAddress: string; accessToken: string };

const key = "savecircle:wallet-session";
let snapshot: string | null | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  if (snapshot !== undefined) return snapshot;
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

export function setWalletSession(session: WalletSession | null) {
  snapshot = session ? JSON.stringify(session) : null;
  try {
    if (snapshot === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, snapshot);
  } catch {
    // The session remains available for client-side navigation in this tab.
  }
  listeners.forEach((listener) => listener());
}

export function useWalletSession() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  return useMemo(() => {
    if (stored == null) return stored;
    try {
      const value: Partial<WalletSession> | null = JSON.parse(stored);
      return typeof value?.walletAddress === "string" && typeof value.accessToken === "string"
        ? { walletAddress: value.walletAddress, accessToken: value.accessToken }
        : null;
    } catch {
      return null;
    }
  }, [stored]);
}
