"use client";

import { useState } from "react";
import { calculatePlan, frequencies, usdc } from "./plan";

export function usePlanner() {
  const [members, setMembers] = useState(5);
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<keyof typeof frequencies>("Monthly");
  const [feedback, setFeedback] = useState("");
  const plan = calculatePlan(members, amount);
  const interval = frequencies[frequency];

  async function copyPlan() {
    const summary = [
      "The Growth Circle · Illustrative Stellar Testnet plan",
      `${members} members · ${interval} · ${usdc(Number(amount) * 100)} per member per cycle`,
      `Pool per cycle: ${usdc(plan.pool)} · Circle total: ${usdc(plan.total)}`,
      ...plan.order.map((member) => `Cycle ${member}: Member ${member} receives ${usdc(plan.pool)}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setFeedback("Savings plan copied.");
    } catch {
      setFeedback("Clipboard access failed. Try copying from a secure browser context.");
    }
  }

  return { members, setMembers, amount, setAmount, frequency, setFrequency, plan, interval, feedback, clearFeedback: () => setFeedback(""), copyPlan };
}
