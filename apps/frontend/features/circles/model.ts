export type Frequency = "Weekly" | "Every 2 weeks" | "Monthly";
export type CircleDraft = {
  name: string; description: string; members: number; amount: string; frequency: Frequency; start: string;
  model: "Rotating" | "Fixed"; order: number[]; orderMethod: "Manual" | "Random"; recipient: number; fixedAmount: string; approvals: number; grace: number; rules: string;
};

export const initialDraft: CircleDraft = {
  name: "", description: "", members: 5, amount: "100", frequency: "Monthly", start: "2025-06-01",
  model: "Rotating", order: [1, 2, 3, 4, 5], orderMethod: "Manual", recipient: 1, fixedAmount: "500",
  approvals: 3, grace: 3, rules: "",
};

const dates = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function cycleStart(start: string, frequency: Frequency, offset = 0) {
  const first = new Date(`${start}T00:00:00Z`);
  if (!start || Number.isNaN(first.getTime())) return null;
  const next = new Date(first);
  if (frequency === "Monthly") {
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + offset);
    const lastDay = new Date(next);
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
    next.setUTCDate(Math.min(first.getUTCDate(), lastDay.getUTCDate()));
  } else {
    next.setUTCDate(next.getUTCDate() + offset * (frequency === "Weekly" ? 7 : 14));
  }
  return next;
}

export function cycleDate(start: string, frequency: Frequency, offset = 0) {
  const date = cycleStart(start, frequency, offset);
  return date ? dates.format(date) : "Date pending";
}

export function payoutRows(draft: CircleDraft) {
  const slots = draft.model === "Fixed" ? [draft.recipient] : draft.order;
  return slots.map((slot, index) => ({ slot, date: cycleDate(draft.start, draft.frequency, index) }));
}

export function shuffledOrder(order: number[]) {
  const next = [...order];
  for (let i = next.length - 1; i > 0; i--) {
    const other = Math.floor(Math.random() * (i + 1));
    [next[i], next[other]] = [next[other], next[i]];
  }
  return next;
}

export type SavedCircle = CircleDraft & { id: string };
export const sampleCircles: SavedCircle[] = [
  { ...initialDraft, id: "growth", name: "The Growth Circle", description: "Monthly savings with friends." },
  { ...initialDraft, id: "lagos", name: "Lagos Founders Circle", description: "A savings circle for local founders.", amount: "200", members: 4, order: [1, 2, 3, 4] },
];

export const slotName = (slot: number) => slot === 1 ? "You (organizer)" : `Member ${slot}`;
