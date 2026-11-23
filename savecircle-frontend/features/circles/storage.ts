"use client";

import { useSyncExternalStore } from "react";
import type { SavedCircle } from "./model";

const key = "savecircle:preview-circles";
const change = "savecircle:circles-change";
const empty = "[]";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(change, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(change, callback);
  };
}

function snapshot() {
  try { return localStorage.getItem(key) ?? empty; }
  catch { return empty; }
}

function parse(value: string): SavedCircle[] {
  try {
    const stored = JSON.parse(value);
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export function useSavedCircles() {
  return parse(useSyncExternalStore(subscribe, snapshot, () => empty));
}
