"use client";

import { useSyncExternalStore } from "react";
import type { WithdrawalRequest } from "../approvals/request";
import type { ExitRequest, ScheduleProposal, SetupInvitation } from "../group-management/records";
import type { Payment } from "./model";

export type PayoutPreview = { state: "pending" | "paid"; submitted: string; confirmed?: string };
type Preview = {
  payments?: Record<string, Payment>;
  proposal?: ScheduleProposal;
  exitRequest?: ExitRequest;
  exitReviewed?: boolean;
  setupInvitation?: SetupInvitation;
  withdrawals?: Record<string, WithdrawalRequest>;
  payoutApprovals?: Record<string, number>;
  payouts?: Record<string, PayoutPreview>;
};
const key = "savecircle:schedule-preview";

function subscribe(callback: () => void) {
  window.addEventListener(key, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(key, callback);
    window.removeEventListener("storage", callback);
  };
}

let fallback: string | undefined;

function snapshot() {
  try { return fallback ?? localStorage.getItem(key) ?? "{}"; }
  catch { return fallback ?? "{}"; }
}

function parse(value: string): Record<string, Preview> {
  try { return JSON.parse(value) ?? {}; }
  catch { return {}; }
}

export function useSchedulePreview(id: string) {
  const value = useSyncExternalStore(subscribe, snapshot, () => "{}");
  return parse(value)[id] ?? {};
}

export function updateSchedulePreview(id: string, change: (preview: Preview) => Preview) {
  const current = parse(snapshot());
  const value = JSON.stringify({ ...current, [id]: change(current[id] ?? {}) });
  try { localStorage.setItem(key, value); fallback = undefined; }
  catch { fallback = value; }
  window.dispatchEvent(new Event(key));
}
