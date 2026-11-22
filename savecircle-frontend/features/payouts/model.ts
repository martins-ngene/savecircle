import { approvalCount, type WithdrawalRequest } from "../approvals/request";
import type { SavedCircle } from "../circles/model";
import { buildSchedule, previewToday, type Payment } from "../schedule/model";
import { contributionPool, cycleRecipient } from "../schedule/pool";
import type { PayoutPreview } from "../schedule/storage";
import { releaseStatus } from "./release";

export const submitTime = "2025-08-05T10:12:00Z";
export const confirmTime = "2025-08-05T10:13:00Z";
export const augustReference = "93bd…a71c";
const previousPayouts = [
  { date: "2025-06-04T14:10:00Z", hash: "2f81…d3a6" },
  { date: "2025-07-04T12:30:00Z", hash: "6b2c…85ef" },
];

export function payoutHref(circle = "surulere", screen?: string, snapshot?: string) {
  const params = new URLSearchParams();
  if (circle !== "surulere") params.set("circle", circle);
  if (screen) params.set("screen", screen);
  if (snapshot) params.set("snapshot", snapshot);
  return `/dashboard/payouts${params.size ? `?${params}` : ""}`;
}

export function payoutView(circle: SavedCircle, today: Date, preview: {
  payments?: Record<string, Payment>;
  payouts?: Record<string, PayoutPreview>;
  withdrawals?: Record<string, WithdrawalRequest>;
  payoutApprovals?: Record<string, number>;
}) {
  const plan = buildSchedule(circle, today, preview.payments ?? {});
  const demo = ["surulere", "growth"].includes(circle.id);
  const cycle = (demo && plan.elapsed.length >= 3 ? plan.cycles[2] : plan.elapsed[0]) ?? plan.cycles[0];
  if (!cycle) return undefined;
  const first = !plan.elapsed.length;
  const pool = contributionPool(circle, cycle, plan.amount);
  const release = preview.payouts?.[cycle.number];
  const authorized = demo;
  const seededApprovals = demo && pool.collected >= pool.target ? Math.max(0, circle.approvals - 1) : 0;
  const request = preview.withdrawals?.[cycle.number];
  const approvals = Math.min(circle.members, request ? approvalCount(request) : Math.max(seededApprovals, preview.payoutApprovals?.[cycle.number] ?? 0));
  const status = releaseStatus({ collected: pool.collected, target: pool.target, approvals, threshold: circle.approvals, authorized, release: release?.state });
  const amount = circle.model === "Fixed" ? Math.round(Number(circle.fixedAmount) * 100) : pool.target;
  const history = demo && cycle.number === 3 ? previousPayouts.map((item, index) => ({
    ...item, number: index + 1, recipient: cycleRecipient(circle, index + 1, pool.people), amount,
  })) : [];
  if (release?.state === "paid") {
    history.push({ number: cycle.number, recipient: pool.recipient, amount, date: release.confirmed ?? release.submitted, hash: augustReference });
  }
  const totalPaid = history.reduce((total, item) => total + item.amount, 0);
  const received = history.filter(item => item.number < cycle.number).reduce((total, item) => total + item.amount, 0) + pool.collected;
  const available = received - totalPaid;
  const next = plan.cycles[cycle.number];
  return { circle, plan, cycle, first, pool, release, status, authorized, approvals, amount, history: history.reverse(), totalPaid, received, available, next };
}

export type PayoutView = NonNullable<ReturnType<typeof payoutView>>;
export const beforeFirstCycle = new Date("2025-05-28T12:00:00Z");
export const payoutPreviewDate = previewToday;
