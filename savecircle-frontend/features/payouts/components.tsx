import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardDialog } from "../dashboard/controls";
import { usdc } from "../landing/plan";
import { Shimmer } from "../loading/shimmer";
import { fullDate, monthYear } from "../schedule/model";
import type { PayoutView } from "./model";

export function PayoutHeading({ title = "Rotating payouts", description = "One shared pool. A clear turn for everyone.", eyebrow = "Your circle / Payouts", children }: {
  title?: string; description?: string; eyebrow?: string; children?: ReactNode;
}) {
  return <header className="payout-heading">
    <div><span className="payout-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {children}
  </header>;
}

export function PayoutLink({ href, children, tone = "white" }: { href: string; children: ReactNode; tone?: "white" | "lime" | "green" | "soft" }) {
  return <Link className="payout-button" data-tone={tone} href={href}>{children}</Link>;
}

export function PayoutLoading({ children, circle = "Surulere Savers", onCancel }: { children?: ReactNode; circle?: string; onCancel?: string }) {
  return <div className="payout-workspace">
    <PayoutHeading description="Retrieving the latest cycle, balances and approval records.">
      <div className="payout-actions">{children ?? <span className="payout-button">{circle}</span>}<span className="payout-button">Checking…</span></div>
    </PayoutHeading>
    <Shimmer title="Checking payout eligibility…" description="Checking pool funding, the scheduled recipient and approval records." footer="Stellar Testnet preview · Release becomes available after the required checks." columns={3}>
      {onCancel && <PayoutLink href={onCancel}>Back to payouts</PayoutLink>}
    </Shimmer>
  </div>;
}

export function PayoutFacts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="payout-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function PayoutTotals({ vm }: { vm: PayoutView }) {
  const { cycle, circle, plan, pool, totalPaid, history, available, status, first } = vm;
  const paid = status === "paid";
  const poolNote = paid ? `${usdc(vm.amount)} released to ${pool.recipient}`
    : first ? `First pool target: ${usdc(pool.target)}`
      : pool.collected === pool.target ? `100% funded · ${pool.paidMembers} members paid`
        : `${pool.percent}% funded · ${usdc(pool.target - pool.collected)} to go`;
  const stats = [
    ["Current cycle", `${cycle.number} of ${plan.cycles.length}`, first ? `Starts ${fullDate(cycle.due)}` : `${monthYear(cycle.due)} · ${paid ? "Paid" : circle.frequency}`],
    [paid ? "Cycle collected" : "Cycle pool", usdc(pool.collected), poolNote],
    ["Total paid out", usdc(totalPaid), history.length ? `${history.length} completed cycle payout${history.length === 1 ? "" : "s"}` : "No completed payouts yet"],
    ["Available group funds", usdc(available), paid ? "No remaining funds this cycle" : first ? "No contributions received yet" : "Held in the savings contract preview"],
  ];
  return <dl className="payout-stats">{stats.map(([title, value, detail]) => <div className="payout-card" key={title}>
    <dt>{title}</dt><dd>{value}</dd><dd>{detail}</dd>
  </div>)}</dl>;
}

export function PayoutTransaction({ hash, inline = false }: { hash: string; inline?: boolean }) {
  return <DashboardDialog className={inline ? "payout-inline" : "payout-button payout-transaction"} title="Preview payout transaction" label="View transaction details ↗">
    <PayoutFacts rows={[["Reference", hash], ["Network", "Stellar Testnet preview"]]} />
    <p>This illustrative reference is available in the preview.</p>
  </DashboardDialog>;
}

export function payoutTimestamp(date: string) {
  const parsed = new Date(date);
  return `${fullDate(parsed)} · ${parsed.toISOString().slice(11, 16)}`;
}

export function compactUSDC(cents: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(cents / 100);
}
