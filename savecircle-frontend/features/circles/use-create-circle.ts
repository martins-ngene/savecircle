"use client";

import { useState } from "react";
import { calculatePlan } from "../landing/plan";
import { initialDraft, payoutRows, shuffledOrder, type CircleDraft, type SavedCircle } from "./model";
import { saveCircle } from "./storage";

export function useCreateCircle() {
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState(0);
  const [reviewEdit, setReviewEdit] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [created, setCreated] = useState<SavedCircle>();
  const [error, setError] = useState("");
  const plan = calculatePlan(draft.members, draft.amount);
  const fixed = calculatePlan(1, draft.fixedAmount);
  const cycles = payoutRows(draft);
  const valid = [
    Boolean(draft.name.trim()),
    plan.valid && Boolean(draft.start),
    draft.model === "Rotating" || (fixed.valid && fixed.pool <= plan.pool),
    confirmed,
  ];

  function update<K extends keyof CircleDraft>(key: K, value: CircleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  }

  function resize(members: number) {
    setDraft((current) => {
      const kept = current.order.filter((slot) => slot <= members);
      const added = Array.from({ length: members }, (_, index) => index + 1).filter((slot) => !kept.includes(slot));
      return { ...current, members, order: [...kept, ...added], approvals: Math.min(current.approvals, members), recipient: Math.min(current.recipient, members) };
    });
    setConfirmed(false);
  }

  function move(index: number, offset: number) {
    const next = [...draft.order];
    const other = index + offset;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    update("order", next);
  }

  function advance() {
    if (!valid[step]) return;
    if (step < 3) {
      setStep(reviewEdit ? 3 : step + 1);
      setReviewEdit(false);
      return;
    }
    if (!valid.every(Boolean) || created) return;
    try {
      const circle = { ...draft, name: draft.name.trim(), description: draft.description.trim(), id: crypto.randomUUID() };
      saveCircle(circle);
      setCreated(circle);
    } catch {
      setError("This browser could not save the circle. Enable local storage and try again.");
    }
  }

  return {
    draft, step, update, resize, move, confirmed, setConfirmed, created, error, plan, fixed, cycles, valid,
    reviewEdit, advance,
    back: () => { setStep(reviewEdit ? 3 : Math.max(0, step - 1)); setReviewEdit(false); },
    edit: (index: number) => { setReviewEdit(true); setStep(index); },
    setOrderMethod: (method: CircleDraft["orderMethod"]) => {
      setDraft((current) => ({ ...current, orderMethod: method, order: method === "Random" ? shuffledOrder(current.order) : current.order }));
      setConfirmed(false);
    },
    redraw: () => update("order", shuffledOrder(draft.order)),
  };
}
