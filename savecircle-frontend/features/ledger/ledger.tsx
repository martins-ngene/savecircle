"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sampleCircles, type SavedCircle } from "../circles/model";
import { useSavedCircles } from "../circles/storage";
import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { scheduleHref } from "../schedule/components";
import { buildSchedule, canPay, dateLabel, fullDate, monthName, monthYear, previewToday, referenceCircle, type Cycle } from "../schedule/model";
import { useSchedulePreview } from "../schedule/storage";
import { contributionRecords, filters, firstCycleSnapshot, ledgerHref, payoutCycle, payoutPayments, payoutSnapshot, type Filter } from "./model";
import { ContributionReceipt, LedgerHeading, LedgerLink, LedgerLoading, LedgerUnavailable, PayoutReceipt, TransactionDetails, timestamp } from "./views";

type Plan = ReturnType<typeof buildSchedule>;
type HistoryItem = { id: string; label: string; detail: string; date: Date; amount: number; hash: string; type: Filter };
const snapshotOptions = [["first", "Before first cycle"], ["payout", "After payout"], ["loading", "Loading"], ["unavailable", "Connection interrupted"]] as const;
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

function Totals({ plan, active, received, position }: { plan: Plan; active?: Cycle; received: number; position?: Cycle }) {
  const paid = plan.cycles.filter(cycle => cycle.status === "Paid");
  const count = paid.length;
  const labels = [
    ["Total contributed", usdc(plan.paid), count ? `Historical · ${count} confirmed payment${count === 1 ? "" : "s"}` : "No confirmed payments yet"],
    ["Outstanding to date", usdc(plan.outstanding), active ? `Cycle ${active.number} · ${active.status === "Pending" ? "Confirmation pending" : active.status === "Overdue" ? `Overdue since ${dateLabel(active.deadline)}` : "Payment due"}`
      : !plan.elapsed.length ? "First contribution not yet due" : "You’re caught up to date"],
    ["Completed payments", `${count} of ${plan.cycles.length}`, count
      ? `${count === 1 ? "Cycle" : "Cycles"} ${new Intl.ListFormat("en-US").format(paid.map(cycle => String(cycle.number)))} settled`
      : plan.cycles[0] ? `Your plan starts ${dateLabel(plan.cycles[0].due, { month: "long", day: "numeric" })}` : "No scheduled cycles"],
    ["Payouts received", usdc(received), received ? "Cycle 4 · Received Sep 5" : position ? `Your turn: Cycle ${position.number} · ${monthName(position.due)}` : "No payout recorded"],
  ];
  return <dl className="ledger-totals">{labels.map(([label, value, note], index) => <div className="ledger-card" key={label}>
    <dt>{label}</dt><dd className={index === 1 && plan.outstanding > 0 ? "ledger-red" : undefined}>{value}</dd><dd>{note}</dd>
  </div>)}</dl>;
}

function paymentHref(circle: string, number: number) {
  return scheduleHref(circle, "pay", number, undefined, "ledger");
}

function CycleTable({ plan, circle, payout, receipt }: { plan: Plan; circle: SavedCircle; payout?: Cycle; receipt: (id: string) => string }) {
  const total = plan.amount * plan.cycles.length;
  return <section className="ledger-card ledger-table-panel" aria-labelledby="ledger-cycle-heading">
    <header className="ledger-section-header"><div><h2 id="ledger-cycle-heading">Contribution ledger</h2>
      <p>Your complete plan · {usdc(total)} across {plan.cycles.length} {circle.frequency.toLowerCase()} {plan.cycles.length === 1 ? "cycle" : "cycles"}</p>
    </div><span className="ledger-cycle-count">All cycles {plan.cycles.length}</span></header>
    <table className="ledger-table" role="table"><thead><tr>
      <th scope="col">Cycle / Due date</th><th scope="col">Expected</th><th scope="col">Paid</th><th scope="col">Status</th><th scope="col"><span className="dash-visually-hidden">Action</span></th>
    </tr></thead><tbody>{plan.cycles.map(cycle => {
      const late = cycle.status === "Paid" && cycle.payment && Date.parse(cycle.payment.date) > cycle.deadline.getTime();
      const status = late ? "Completed late" : cycle.status === "Paid" ? "Completed" : cycle.status === "Pending" ? "Confirming" : cycle.status;
      return <tr key={cycle.number}>
        <th scope="row">Cycle {cycle.number} · {fullDate(cycle.due)}</th>
        <td data-label="Expected">{usdc(plan.amount)}</td><td data-label="Paid">{usdc(cycle.paid)}</td>
        <td data-label="Status"><span className="ledger-status" data-status={status}>{status}</span></td>
        <td>{cycle.status === "Paid" ? <Link href={receipt(String(cycle.number))}>View receipt ↗</Link>
          : canPay(cycle) || cycle.status === "Pending" ? <Link className={cycle.status === "Overdue" ? "ledger-red" : undefined} href={paymentHref(circle.id, cycle.number)}>
            {cycle.status === "Pending" ? "Check status" : "Pay now →"}</Link>
            : <span className="ledger-muted">{cycle.number === payout?.number ? "Your payout cycle" : cycle.number === plan.cycles.length ? "Final cycle" : "Scheduled"}</span>}</td>
      </tr>;
    })}</tbody></table>
    <footer className="ledger-table-footer"><strong>Lifetime plan · {usdc(total)}</strong><p>Future obligations · {usdc(total - plan.expected)} · Not yet due</p></footer>
  </section>;
}

function PaymentHistory({ records, filter, month, reset, filterHref, receipt, name }: {
  records: HistoryItem[]; filter: Filter; month: string; reset: string; filterHref: (filter: Filter) => string; receipt: (id: string) => string; name: string;
}) {
  const matches = records.filter(record => (filter === "All activity" || filter === record.type) && (!month || monthKey(record.date) === month));
  if (matches.length === 0) return <section className="ledger-card ledger-feature">
    <span className="ledger-eyebrow">Payment history</span><h2>No {filter === "All activity" ? "transactions" : filter.toLowerCase()} match these filters.</h2>
    <p>There are no matching confirmed records in {name}.</p>
    <LedgerLink href={reset} tone="primary">Show all transactions</LedgerLink>
    <p>Ledger totals reflect the selected circle across all activity.</p>
  </section>;

  return <section className="ledger-card ledger-table-panel" aria-labelledby="ledger-history-heading">
    <header className="ledger-section-header"><h2 id="ledger-history-heading">Payment history</h2>
      <nav className="ledger-history-filters" aria-label="Payment activity">{filters.map(item => <Link key={item} href={filterHref(item)} aria-current={item === filter ? "true" : undefined}>{item}</Link>)}</nav>
    </header>
    <table className="ledger-table ledger-history-table" role="table"><thead><tr>
      <th scope="col">Transaction</th><th scope="col">Timestamp · UTC</th><th scope="col">Amount</th><th scope="col">Hash</th><th scope="col"><span className="dash-visually-hidden">Action</span></th>
    </tr></thead><tbody>{matches.map(item => <tr key={item.id}>
      <th scope="row">{item.label}<small>{item.detail}</small></th><td data-label="Timestamp · UTC">{timestamp(item.date)}</td>
      <td data-label="Amount"><strong>{usdc(item.amount)}</strong></td><td data-label="Hash">{item.hash}</td><td><Link href={receipt(item.id)}>View receipt ↗</Link></td>
    </tr>)}</tbody></table>
    <p className="ledger-history-note">Showing {matches.length} confirmed transaction{matches.length === 1 ? "" : "s"} · Totals update after confirmation.</p>
  </section>;
}

export function Ledger() {
  const params = useSearchParams();
  const router = useRouter();
  const circles = [referenceCircle, ...useSavedCircles(), ...sampleCircles];
  const id = params.get("circle") ?? referenceCircle.id;
  const local = useSchedulePreview(id);
  const circle = circles.find(item => item.id === id);
  const requested = params.get("snapshot");
  const snapshot = snapshotOptions.find(([value]) => value === requested)?.[0];
  const schedule = scheduleHref(circle?.id);
  const reset = ledgerHref(id, { snapshot });
  if (snapshot === "loading") return <LedgerLoading schedule={schedule} exit={ledgerHref(id)} />;
  if (!circle || snapshot === "unavailable") return <LedgerUnavailable name={circle?.name ?? "Savings circle"} retry={ledgerHref(circle?.id ?? referenceCircle.id)} schedule={schedule} />;

  const first = circle.id === referenceCircle.id && snapshot === "first";
  const afterPayout = circle.id === referenceCircle.id && snapshot === "payout";
  const sample = circle === referenceCircle || sampleCircles.includes(circle);
  const today = first ? firstCycleSnapshot : afterPayout ? payoutSnapshot : sample ? previewToday : new Date();
  const plan = buildSchedule(circle, today, first ? {} : afterPayout ? payoutPayments : local.payments ?? {});
  const records = contributionRecords(plan.cycles);
  const pending = plan.cycles.find(item => item.status === "Pending");
  const due = plan.cycles.find(canPay);
  const settled = records.find(item => item.cycle.payment?.state === "paid");
  const position = circle.id === referenceCircle.id ? plan.cycles[payoutCycle - 1] : undefined;
  const received = afterPayout ? plan.amount * circle.members : 0;
  const firstCycle = plan.cycles[0];
  const isEmpty = plan.elapsed.length === 0;
  const filter = filters.find(item => item.toLowerCase() === params.get("activity")) ?? filters[0];
  const month = params.get("month") ?? "";
  const receiptId = params.get("receipt");
  const current = ledgerHref(id, { snapshot, filter, month });
  const receiptHref = (receipt: string) => ledgerHref(id, { snapshot, filter, month, receipt });
  const history: HistoryItem[] = records.map(record => ({
    id: String(record.cycle.number), label: `Contribution · ${monthName(record.cycle.due)}`, date: record.date,
    detail: record.late ? `Cycle ${record.cycle.number} · Confirmed · Paid late` : `${circle.name} · Confirmed`,
    amount: record.amount, hash: record.hash, type: "Contributions",
  }));
  if (afterPayout) history.unshift({ id: "payout", label: "Payout · September", detail: `${circle.name} · Cycle 4 · Confirmed`,
    date: payoutSnapshot, amount: received, hash: "b6e1…a732", type: "Payouts" });
  const dates = [...new Map(history.map(item => [monthKey(item.date), monthYear(item.date)])).entries()];
  const noMatches = !history.some(item => (filter === "All activity" || item.type === filter) && (!month || monthKey(item.date) === month));
  const filtered = Boolean(month || filter !== "All activity");

  if (receiptId === "payout" && afterPayout) return <PayoutReceipt back={current} received={received} contributed={plan.paid} />;
  const receipt = records.find(record => String(record.cycle.number) === receiptId);
  if (receipt) return <ContributionReceipt record={receipt} circle={circle.name} total={plan.cycles.length} expected={plan.amount} back={current} />;

  return <div className="member-ledger">
    <LedgerHeading description={first || afterPayout ? `${circle.name} · ${member.name} · Snapshot: ${fullDate(today)}` : undefined}>
      <LedgerLink href={schedule}>View schedule</LedgerLink>
    </LedgerHeading>
    {receiptId && <p role="status">This receipt is unavailable for the selected circle.</p>}
    <Totals plan={plan} active={pending ?? due} received={received} position={position} />
    {!(filtered && noMatches) && <>
      {pending && <section className="ledger-card ledger-banner ledger-amber">
        <span className="ledger-eyebrow">Transaction submitted{pending.payment && ` · ${timestamp(new Date(pending.payment.date))} UTC`}</span>
        <h2>Your {monthName(pending.due)} payment is confirming.</h2>
        <strong>{usdc(plan.amount)} · {circle.name} · Cycle {pending.number}</strong>
        <p>Your preview wallet approved this payment. Totals update after confirmation.</p>
        <ol className="ledger-pending-steps"><li>Wallet approved</li><li>Transaction submitted</li><li>Awaiting confirmation</li></ol>
        <div className="ledger-actions"><LedgerLink href={paymentHref(circle.id, pending.number)} tone="primary">Check confirmation status</LedgerLink>
          <TransactionDetails hash={pending.number === 3 ? "8f2a…c91d" : undefined} /></div>
        <small>Stellar Testnet preview {pending.number === 3 && "· 8f2a…c91d"}</small>
      </section>}
      {!pending && due && <div className="ledger-columns">
        <section className="ledger-card ledger-banner ledger-dark">
          <span className="ledger-eyebrow">Action needed · Cycle {due.number}</span>
          <h2>{monthName(due.due)} contribution is {due.status.toLowerCase()}.</h2>
          <p>{usdc(plan.amount)} · Due {dateLabel(due.due)} · Deadline {dateLabel(due.deadline)}, 23:59 UTC</p>
          <LedgerLink href={paymentHref(circle.id, due.number)} tone="lime">Pay contribution →</LedgerLink>
          <small>You approve each payment in your wallet.</small>
        </section>
        {position && <aside className="ledger-card ledger-banner">
          <span className="ledger-eyebrow">{circle.name}</span><h2>Payout spot {position.number} of {plan.cycles.length}</h2>
          <p>Cycle {position.number} · {monthYear(position.due)}</p>
          <p>Next payment deadline: {dateLabel(position.deadline)}, 23:59 UTC</p><strong>Active member · {member.wallet}</strong>
        </aside>}
      </div>}
      {!pending && !due && settled && !afterPayout && <section className="ledger-card ledger-banner ledger-lime">
        <span className="ledger-eyebrow">Payment confirmed</span><h2>{usdc(settled.amount)} added to your ledger.</h2>
        <p>{timestamp(settled.date)} UTC · Cycle {settled.cycle.number} settled{settled.late ? " late" : ""}. Outstanding to date is {usdc(plan.outstanding)}.</p>
        <div className="ledger-actions"><LedgerLink href={receiptHref(String(settled.cycle.number))} tone="primary">View {monthName(settled.cycle.due)} receipt</LedgerLink>
          <LedgerLink href={schedule}>View schedule</LedgerLink></div>
      </section>}
    </>}
    {(!isEmpty || snapshot !== "first") && <div className="ledger-toolbar">
      <select className="ledger-button" aria-label="Savings circle" value={id} onChange={event => router.push(ledgerHref(event.target.value))}>
        {circles.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select>
      {filtered ? <>
        {filter !== "All activity" && <LedgerLink href={ledgerHref(id, { snapshot, month })} tone="soft">{filter} ×</LedgerLink>}
        <select className="ledger-button" aria-label="Filter by month" value={month} onChange={event => router.push(ledgerHref(id, { snapshot, filter, month: event.target.value }))}>
          <option value="">All dates</option>{dates.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select>
        <LedgerLink href={reset}>Clear filters</LedgerLink>
      </> : <>
        <p>{circle.frequency} · {plan.amount / 100} USDC per cycle · All dates in UTC</p>
        {!isEmpty && <select className="ledger-button" aria-label="Filter by month" value="" onChange={event => router.push(ledgerHref(id, { snapshot, month: event.target.value }))}>
          <option value="">All dates</option>{dates.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select>}
        <button className="ledger-button ledger-refresh" onClick={() => window.location.reload()}>Refresh</button>
      </>}
    </div>}
    {isEmpty && !filtered ? <>
      <section className="ledger-card ledger-feature">
        <span className="ledger-eyebrow">Ready for your first cycle</span><h2>Your ledger is ready. Your story starts next.</h2>
        <p>Confirmed contributions, payouts and refunds will appear here after your first payment.</p>
        <LedgerLink href={schedule} tone="primary">View contribution schedule</LedgerLink>
      </section>
      {firstCycle && <section className="ledger-card ledger-banner ledger-soft">
        <h2>Your first contribution</h2><h3>{usdc(plan.amount)} · Due {fullDate(firstCycle.due)}</h3>
        <p>Deadline: {dateLabel(firstCycle.deadline)}, 23:59 UTC · {circle.frequency} · {plan.cycles.length} contributions in your plan</p>
        {position && <p>Your payout position is {position.number} of {plan.cycles.length}.</p>}
      </section>}
    </> : <>
      {!(filtered && noMatches) && <CycleTable plan={plan} circle={circle} payout={position} receipt={receiptHref} />}
      <PaymentHistory records={history} filter={filter} month={month} reset={reset} filterHref={activity => ledgerHref(id, { snapshot, filter: activity, month })} receipt={receiptHref} name={circle.name} />
      {!(filtered && noMatches) && <aside className="ledger-note">
        <h3>Current withdrawable amount · 0.00 USDC</h3>
        <p>Payouts and refunds depend on circle rules, available funds and member approvals.</p><small>Illustrative ledger · Stellar Testnet preview</small>
      </aside>}
    </>}
    {circle.id === referenceCircle.id && <label className="ledger-preview"><span>Ledger preview</span><select className="ledger-button" value={snapshot ?? ""} onChange={event => router.push(ledgerHref(id, { snapshot: event.target.value }))}>
      <option value="">Current records</option>{snapshotOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>}
  </div>;
}
