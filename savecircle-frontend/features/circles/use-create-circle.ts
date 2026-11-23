"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { setWalletSession, useWalletSession } from "@/lib/wallet-session";
import { calculatePlan } from "../landing/plan";
import { createCircle, type ApiCircle } from "./api";
import { initialDraft, type CircleDraft } from "./model";

export function useCreateCircle() {
  const session = useWalletSession();
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState(0);
  const [reviewEdit, setReviewEdit] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [created, setCreated] = useState<ApiCircle>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const plan = calculatePlan(draft.members, draft.amount);
  const valid = [Boolean(draft.name.trim() && draft.description.trim()), plan.valid, true, confirmed];

  function update<K extends keyof CircleDraft>(key: K, value: CircleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  }

  function resize(members: number) {
    setDraft((current) => ({ ...current, members, approvals: Math.min(current.approvals, members) }));
    setConfirmed(false);
  }

  async function advance() {
    if (!valid[step] || submitting.current) return;
    if (step < 3) {
      setStep(reviewEdit ? 3 : step + 1);
      setReviewEdit(false);
      return;
    }
    if (!valid.every(Boolean) || created || !session) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      setCreated(await createCircle(draft, session.accessToken));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setWalletSession(null);
      setError(err instanceof Error ? err.message : "Could not create the circle.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return {
    draft, session, step, update, resize, confirmed, setConfirmed, created, error, plan, valid, busy, reviewEdit, advance,
    back: () => { setStep(reviewEdit ? 3 : Math.max(0, step - 1)); setReviewEdit(false); },
    edit: (index: number) => { setReviewEdit(true); setStep(index); },
  };
}
