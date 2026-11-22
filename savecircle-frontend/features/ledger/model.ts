import type { Cycle, Payment } from "../schedule/model";

export const firstCycleSnapshot = new Date("2025-05-28T12:00:00Z");
export const payoutSnapshot = new Date("2025-09-05T11:08:00Z");
export const payoutCycle = 4;
export const payoutPayments: Record<string, Payment> = {
  3: { state: "paid", date: "2025-08-05T09:42:00Z" },
  4: { state: "paid", date: "2025-09-01T09:14:00Z" },
};

export const filters = ["All activity", "Contributions", "Payouts", "Refunds"] as const;
export type Filter = typeof filters[number];

export type ContributionRecord = { cycle: Cycle; amount: number; date: Date; hash: string; late: boolean };
const historical = [
  { hour: 10, minute: 24, hash: "7d32…e49a" },
  { hour: 8, minute: 16, hash: "4a7f…b82e" },
];

export function contributionRecords(cycles: Cycle[]): ContributionRecord[] {
  return cycles.filter(cycle => cycle.status === "Paid").map(cycle => {
    const example = historical[cycle.number - 1];
    const date = new Date(cycle.payment?.date ?? cycle.due);
    if (!cycle.payment && example) date.setUTCHours(example.hour, example.minute);
    const hash = !cycle.payment && example ? example.hash : cycle.number === 3 ? "8f2a…c91d" : `Preview · Cycle ${cycle.number}`;
    return { cycle, amount: cycle.paid, date, hash, late: date > cycle.deadline };
  }).sort((a, b) => b.date.getTime() - a.date.getTime() || b.cycle.number - a.cycle.number);
}

export function ledgerHref(circle: string, options: { snapshot?: string; filter?: Filter; month?: string; receipt?: string } = {}) {
  const { snapshot, filter, month, receipt } = options;
  const query = new URLSearchParams();
  if (circle !== "surulere") query.set("circle", circle);
  if (snapshot) query.set("snapshot", snapshot);
  if (filter && filter !== "All activity") query.set("activity", filter.toLowerCase());
  if (month) query.set("month", month);
  if (receipt) query.set("receipt", receipt);
  return `/dashboard/ledger${query.size ? `?${query}` : ""}`;
}
