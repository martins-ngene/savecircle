import { approvalReference, requestReference } from "../approvals/request";
import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { payoutTimestamp } from "../payouts/components";
import type { PayoutView } from "../payouts/model";
import { dateLabel, monthYear } from "../schedule/model";
import type { useSchedulePreview } from "../schedule/storage";

export const organizer = { name: "Kelechi M.", initials: "KM", wallet: "GBKM…2F9A" };
const wallets = [organizer.wallet, "GBTI…6R8M", "GBNR…8L2Q", member.wallet, "GBBI…5N7T"];
export const exitReason = "I may not be able to continue after August. Please review my remaining commitments.";
export const exitDate = "Aug 5, 2025 · 10:06 UTC";
export const proposalReference = "d82a…441f";
export const groupPath = "/dashboard/group-management";

export function groupHref(tab: string, options: Record<string, string> = {}) {
  const params = new URLSearchParams(tab === "members" ? options : { tab, ...options });
  return params.size ? `${groupPath}?${params}` : groupPath;
}

export function groupMembers(vm: PayoutView) {
  return vm.pool.people.map((name, index) => {
    const isAda = name === member.name;
    const position = vm.circle.order.indexOf(index + 1) + 1;
    const turn = vm.plan.cycles[position - 1];
    const payouts = vm.history.filter(item => item.recipient === name);
    const obligations = vm.plan.cycles.map(cycle => {
      const status = isAda ? cycle.status : cycle.status === "Upcoming" ? "Upcoming" : "Paid";
      const late = isAda && !!cycle.payment && status === "Paid" && new Date(cycle.payment.date) > cycle.deadline;
      return { ...cycle, status, late, paid: status === "Paid" ? vm.plan.amount : 0 };
    });
    return {
      id: String(index + 1), name, isAda, wallet: wallets[index], role: index === 0 ? "Organizer" : "Member", position, turn,
      current: obligations[vm.cycle.number - 1], obligations,
      contributed: obligations.reduce((sum, cycle) => sum + cycle.paid, 0),
      received: payouts.reduce((sum, payout) => sum + payout.amount, 0),
      turnLabel: payouts.length ? "Paid" : position === vm.cycle.number ? "Current" : monthYear(turn.due),
      overdue: obligations.filter(cycle => cycle.status === "Overdue").length * vm.plan.amount,
      future: obligations.filter(cycle => cycle.status === "Upcoming").length * vm.plan.amount,
    };
  });
}

export type GroupMember = ReturnType<typeof groupMembers>[number];

type Event = { category: string; name: string; details: string; member: string; date: string; reference: string; href?: string };

export function groupActivity(vm: PayoutView, preview: ReturnType<typeof useSchedulePreview>) {
  const request = preview.withdrawals?.[vm.cycle.number];
  const events: Event[] = vm.history.map(item => ({
    category: "Payouts", name: `Cycle ${item.number} payout completed`, details: `${usdc(item.amount)} sent to the agreed recipient.`,
    member: item.recipient, date: item.date, reference: item.hash, href: "/dashboard/payouts",
  }));
  events.push({ category: "Membership", name: "Member activated", details: "Registered a unique wallet and accepted the group rules.", member: "Bisi A.", date: "2025-05-28T00:00:00Z", reference: "Membership record", href: groupHref("members", { member: "5" }) });
  if (vm.cycle.status === "Paid" && vm.cycle.payment) events.push({
    category: "Contributions", name: "Contribution confirmed", details: `${usdc(vm.cycle.paid)} received for Cycle ${vm.cycle.number}.`,
    member: member.name, date: vm.cycle.payment.date, reference: "8f2a…c91d", href: "/dashboard/ledger",
  });
  if (request?.phase === "open" || !request && vm.status !== "funding") events.push({
    category: "Approvals", name: "Withdrawal request created", details: `${usdc(vm.amount)} proposed for ${vm.pool.recipient}.`,
    member: member.name, date: "2025-08-05T09:45:00Z", reference: requestReference, href: "/dashboard/approvals",
  });
  if (request?.vote === "confirmed") events.push({
    category: "Approvals", name: "Approval confirmed", details: `Confirmed member vote for the Cycle ${vm.cycle.number} payout request.`,
    member: vm.pool.recipient, date: "2025-08-05T10:05:00Z", reference: approvalReference, href: "/dashboard/approvals?view=review",
  });
  events.push({
    category: "Membership", name: "Exit requested", details: "Membership stays active during eligibility review.",
    member: member.name, date: "2025-08-05T10:06:00Z", reference: "EX-001", href: groupHref("exits"),
  });
  if (preview.proposal && !preview.proposal.phase) events.push({
    category: "Approvals", name: "Schedule proposal registered", details: `Proposed ${preview.proposal.days}-day payment window from Cycle ${preview.proposal.cycle}.`,
    member: organizer.name, date: "2025-08-05T10:09:00Z", reference: proposalReference, href: groupHref("rules", { view: "proposal" }),
  });
  return events.sort((a, b) => b.date.localeCompare(a.date)).map(event => ({
    ...event, time: event.reference === "Membership record" ? dateLabel(new Date(event.date), { month: "short", day: "numeric", year: "numeric" }) : payoutTimestamp(event.date),
  }));
}
