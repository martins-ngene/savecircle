import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardDialog } from "../dashboard/controls";
import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { Shimmer } from "../loading/shimmer";
import { fullDate, monthName, monthYear } from "../schedule/model";
import { payoutCycle, payoutSnapshot, type ContributionRecord } from "./model";

export function LedgerLink({ href, children, tone = "plain" }: { href: string; children: ReactNode; tone?: "plain" | "primary" | "lime" | "soft" }) {
  return <Link href={href} className="ledger-button" data-tone={tone}>{children}</Link>;
}

export function LedgerHeading({ title = "Member ledger", description = `${member.name} · Your contribution and payout records · Stellar Testnet preview.`, receipt = false, children }: {
  title?: string; description?: string; receipt?: boolean; children?: ReactNode;
}) {
  return <header className="ledger-heading"><div>
    <span className="ledger-eyebrow">{receipt ? "Your records / Contribution" : "Your records"}</span>
    <h1>{title}</h1><p>{description}</p>
  </div>{children}</header>;
}

export function LedgerLoading({ schedule = "/dashboard/schedule", exit }: { schedule?: string; exit?: string }) {
  return <div className="member-ledger">
    <LedgerHeading><LedgerLink href={schedule}>View schedule</LedgerLink></LedgerHeading>
    <Shimmer title="Verifying your records…" description="Retrieving contributions, payout records and cycle obligations." footer="Stellar Testnet preview · Records will appear when loading finishes." cards={4}>
      {exit && <Link className="ledger-button shimmer-action" href={exit}>Return to ledger</Link>}
    </Shimmer>
  </div>;
}

export function TransactionDetails({ hash, primary = false }: { hash?: string; primary?: boolean }) {
  return <DashboardDialog className={`ledger-button${primary ? " ledger-primary" : ""}`} title="Preview transaction" label="View transaction details ↗">
    {hash && <p>Sample transaction reference · {hash}</p>}
    <p>Stellar Testnet preview records use illustrative transaction references.</p>
  </DashboardDialog>;
}

export function LedgerUnavailable({ name, retry, schedule }: { name: string; retry: string; schedule: string }) {
  return <div className="member-ledger">
    <LedgerHeading description={`${name} · We couldn’t verify your latest records.`}><LedgerLink href={schedule}>View schedule</LedgerLink></LedgerHeading>
    <section className="ledger-card ledger-feature">
      <span className="ledger-eyebrow ledger-red">Connection interrupted</span>
      <h2>Your ledger is temporarily unavailable.</h2>
      <p>Records could not be reached. Retry to load your contribution and payout totals.</p>
      <dl className="ledger-unavailable">{["Contributed", "Outstanding", "Payouts"].map(label => <div key={label}><dt>{label}</dt><dd>—</dd></div>)}</dl>
      <LedgerLink href={retry} tone="primary">Retry connection</LedgerLink>
      <p>Preview wallet · {member.wallet} · Stellar Testnet</p>
    </section>
    <section className="ledger-stack"><h3>Already submitted a contribution?</h3>
      <p>Check the transaction status before starting another payment.</p>
      <TransactionDetails />
    </section>
  </div>;
}

export function timestamp(date: Date) {
  return `${fullDate(date)} · ${date.toISOString().slice(11, 16)}`;
}

function ReceiptFacts({ items }: { items: [string, string][] }) {
  return <dl className="ledger-facts">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function ContributionReceipt({ record, circle, total, expected, back }: {
  record: ContributionRecord; circle: string; total: number; expected: number; back: string;
}) {
  const { cycle, date, hash, late, amount } = record;
  return <div className="member-ledger">
    <div className="ledger-stack"><LedgerLink href={back}>← Back</LedgerLink>
      <LedgerHeading title="Contribution receipt" description={`${circle} · Cycle ${cycle.number} · ${monthYear(cycle.due)}`} receipt />
    </div>
    <section className="ledger-card ledger-receipt">
      <div className="ledger-receipt-hero ledger-soft">
        <span className="ledger-eyebrow">Confirmed · Stellar Testnet preview</span>
        <strong>{usdc(amount)}</strong><p>{monthName(cycle.due)} contribution · {late ? "Paid late, now settled" : "Paid on time"}</p>
      </div>
      <ReceiptFacts items={[
        ["Member", member.name], ["Savings circle", circle], ["Contribution cycle", `Cycle ${cycle.number} of ${total} · ${monthYear(cycle.due)}`],
        ["Expected / paid", `${usdc(expected).replace(" USDC", "")} / ${usdc(amount)}`], ["Payment deadline", `${fullDate(cycle.deadline)} · 23:59 UTC`],
        ["Confirmed at", `${timestamp(date)} UTC`], ["From registered wallet", member.wallet], ["To", `${circle} savings contract`],
        ["Transaction hash", hash], ["Network / token", "Stellar Testnet preview · Testnet USDC"],
      ]} />
      <div className="ledger-actions"><TransactionDetails hash={hash} primary /><LedgerLink href={back} tone="soft">Back to previous view</LedgerLink></div>
    </section>
    <aside className="ledger-note"><h3>A permanent contribution record</h3>
      <p>Your payout follows the circle’s agreed order and member approval rules.</p><small>Illustrative receipt · Preview reference</small>
    </aside>
  </div>;
}

export function PayoutReceipt({ back, received, contributed }: { back: string; received: number; contributed: number }) {
  return <div className="member-ledger">
    <div className="ledger-stack"><LedgerLink href={back}>← Back</LedgerLink>
      <LedgerHeading title="Payout receipt" description={`Surulere Savers · ${member.name} · Snapshot: ${fullDate(payoutSnapshot)}`} receipt />
    </div>
    <dl className="ledger-totals">
      {[
        ["Total contributed", usdc(contributed), "4 confirmed contributions"],
        ["Payouts received", usdc(received), "Cycle 4 · Received Sep 5"],
        ["Outstanding to date", usdc(0), "October is not yet due"],
        ["Withdrawable now", usdc(0), "Payout already sent to wallet"],
      ].map(([label, value, note]) => <div className="ledger-card" key={label}><dt>{label}</dt><dd>{value}</dd><dd>{note}</dd></div>)}
    </dl>
    <section className="ledger-card ledger-receipt">
      <div className="ledger-receipt-hero ledger-dark">
        <span className="ledger-eyebrow">Payout received · Cycle {payoutCycle} of 5</span>
        <strong>{usdc(received)}</strong><p>Sent to your registered wallet · {timestamp(payoutSnapshot)} UTC</p>
      </div>
      <ReceiptFacts items={[
        ["Recipient", `${member.name} · ${member.wallet}`], ["Payout position", "4 of 5 · September 2025"],
        ["Funding", `${usdc(received).replace(" USDC", "")} / ${usdc(received)} · All 5 members paid`],
        ["Approvals", "3 of 5 members approved"], ["Execution", "Confirmed · This cycle can only pay out once"],
        ["Transaction hash", "b6e1…a732"], ["Network", "Stellar Testnet preview · Testnet USDC"],
      ]} />
      <div className="ledger-actions"><TransactionDetails hash="b6e1…a732" primary /><LedgerLink href={back} tone="soft">Back to previous view</LedgerLink></div>
    </section>
    <aside className="ledger-note"><h3>Your savings commitment continues after payout.</h3>
      <p>100.00 USDC remains for Cycle 5. It is due October 1, with a deadline of October 4 at 23:59 UTC.</p>
      <p>Historical contributions ({usdc(contributed)}) and payouts received ({usdc(received)}) are recorded separately. The current withdrawable amount is 0.00 USDC.</p>
    </aside>
  </div>;
}
